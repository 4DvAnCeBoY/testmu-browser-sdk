import { testMuBrowser } from '../src/testMuBrowser/index.js';
import { generateObject } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { z } from 'zod';

// 1. Configure Local LLM Provider using official Vercel Provider
// This connects to standard http://localhost:11434
const model = ollama('llama3');

// Define the schema for the Agent's decisions
const ActionSchema = z.object({
    reasoning: z.string().describe("Your thought process for choosing this action"),
    action: z.enum(['click', 'type', 'finish']).describe("The action to perform"),
    selector: z.string().optional().describe("The CSS selector to interact with (if click/type)"),
    text: z.string().optional().describe("The text to type (if action is type)"),
});

async function runAgent() {
    const client = new testMuBrowser();

    // 2. Initialize Infrastructure
    console.log("🚀 Launching local browser...");
    const session = await client.sessions.create({ local: true });

    // 3. Connect Adapter
    const browser = await client.puppeteer.connect(session);
    const page = await browser.newPage();

    console.log("🌐 Navigating...");
    await page.goto('https://news.ycombinator.com/');

    // 4. Agent Loop
    const goal = "Find the search input, type 'AI Agents', and search.";
    console.log(`🎯 Goal: ${goal}`);

    // Get State (Snapshot)
    // In a real agent, you might want to simplify this HTML or use specific accessibility tree
    const state = await client.quick.scrape(page.url());
    const content = state.content as any;
    const context = content.cleaned_html?.substring(0, 5000) || "No content"; // Truncate for local LLM context window

    // 5. Ask Vercel AI SDK (The "Brain")
    console.log("🧠 asking local LLM (Ollama)...");
    const { object: decision } = await generateObject({
        model: model as any,
        schema: ActionSchema,
        prompt: `
            You are a browser automation agent.
            Goal: ${goal}
            
            Current Page HTML:
            ${context}
            
            Decide the next action.
        `,
    });

    console.log(`🤖 Decision:`, decision);

    // 6. Execute Action
    if (decision.action === 'type' && decision.selector && decision.text) {
        await page.type(decision.selector, decision.text);
        await page.keyboard.press('Enter');
        console.log("✅ Typed search term");
    } else if (decision.action === 'click' && decision.selector) {
        await page.click(decision.selector);
        console.log("✅ Clicked element");
    }

    console.log("🎉 Interaction Complete");

    // Cleanup
    await client.sessions.release(session.id);
}

runAgent().catch(console.error);
