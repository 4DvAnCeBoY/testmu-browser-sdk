import { testMuBrowser } from '../../src/testMuBrowser/index.js';
import { Page, Browser } from 'puppeteer-core';
import { generateObject } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { AgentActionSchema, AgentAction, AgentState, AgentResult } from './types.js';
import { config } from './config.js';

/**
 * Enterprise-Grade Browser Agent
 * Encapsulates lifecycle, resilience, and observability.
 */
export class BrowserAgent {
    private client: testMuBrowser;
    private session: any; // Typed as any for now, usually has an ID
    private browser?: Browser;
    private page?: Page;
    private history: AgentAction[] = [];
    private data: Record<string, any> = {};

    constructor() {
        this.client = new testMuBrowser();
    }

    /**
     * Initializes the agent environment (Browser + Page)
     */
    async init() {
        console.log("🚀 Initializing Enterprise Agent...");

        // 1. Create Session (Handles Local/Remote automatically based on args)
        // For this example, we respect the config.
        const sessionConfig = config.BROWSER_WSE
            ? { region: 'us-east-1' } // Example for remote
            : { local: true };

        this.session = await this.client.sessions.create(sessionConfig);

        // 2. Connect via Adapter
        // Using Puppeteer adapter as the "Hands"
        this.browser = await this.client.puppeteer.connect(this.session);
        this.page = await this.browser.newPage();

        // 3. Apply Stealth (If local)
        // Note: testMuBrowser might handle this internally, but explicit check is good.
        // For this example, assuming 'connect' handles basic requirements.

        console.log("✅ Browser Connected");
    }

    /**
     * The Main Agent Loop
     */
    async run(goal: string, verifiedUrl: string): Promise<AgentResult> {
        if (!this.page) throw new Error("Agent not initialized. Call init() first.");

        const startTime = Date.now();
        console.log(`🎯 Goal: ${goal}`);

        try {
            await this.page.goto(verifiedUrl, { waitUntil: 'domcontentloaded' });

            let done = false;
            let steps = 0;
            const MAX_STEPS = 10;

            while (!done && steps < MAX_STEPS) {
                steps++;
                console.log(`\n--- Step ${steps} ---`);

                // 1. Perceive
                const state = await this.perceive();

                // 2. Decide
                const decision = await this.decide(goal, state);
                this.history.push(decision);
                console.log(`🧠 Thought: ${decision.thought}`);
                console.log(`⚡ Action: ${decision.action} -> ${JSON.stringify(decision.params)}`);

                // 3. Act
                if (decision.action === 'done') {
                    done = true;
                } else {
                    await this.act(decision);
                }
            }

            return {
                success: done,
                data: this.data,
                history: this.history,
                durationMs: Date.now() - startTime
            };

        } catch (error: any) {
            console.error("💥 Agent Crash:", error);
            return {
                success: false,
                data: this.data,
                history: this.history,
                durationMs: Date.now() - startTime
            };
        } finally {
            await this.cleanup();
        }
    }

    private async perceive(): Promise<AgentState> {
        if (!this.page) throw new Error("No page");

        // Use 'quick' service for efficient scraping/snapshotting if available, 
        // or raw Puppeteer for fine control.
        const url = this.page.url();
        const title = await this.page.title();

        // Simplified DOM Snapshot for LLM to avoid token overflow
        const domSnippet = await this.page.evaluate(() => {
            // Basic heuristic: visible text or inputs
            return document.body.innerText.substring(0, 5000)
                .replace(/\s+/g, ' ').trim();
        });

        return {
            url,
            title,
            domSnippet
        };
    }

    private async decide(goal: string, state: AgentState): Promise<AgentAction> {
        // Factory for Model
        const model = config.OPENAI_API_KEY
            ? createOpenAI({ apiKey: config.OPENAI_API_KEY })('gpt-4o')
            : ollama(config.MODEL_NAME);

        // System Prompt Pattern: "You are a senior QA engineer..."
        const systemPrompt = `
            You are a precision browser automation agent.
            Goal: ${goal}
            
            Current State:
            - URL: ${state.url}
            - Title: ${state.title}
            
            Page Content (Truncated):
            ${state.domSnippet}
            
            INSTRUCTIONS:
            1. Analyze the page content to find relevant elements.
            2. Choose the most reliable action.
            3. If the goal is achieved, choose 'done'.
        `;

        const response = await generateObject({
            model: model as any,
            schema: AgentActionSchema, // Usage of Zod for "Connect 7" type safety
            prompt: systemPrompt,
        });

        return response.object;
    }

    private async act(decision: AgentAction) {
        if (!this.page) return;

        const { action, params } = decision;

        switch (action) {
            case 'navigate':
                if (params.url) await this.page.goto(params.url);
                break;

            case 'click':
                if (params.selector) {
                    await this.page.waitForSelector(params.selector, { timeout: 5000 });
                    await this.page.click(params.selector);
                }
                break;

            case 'type':
                if (params.selector && params.text) {
                    await this.page.waitForSelector(params.selector);
                    await this.page.type(params.selector, params.text);
                }
                break;

            case 'extract':
                // Simulating data extraction
                if (params.selector && params.key) {
                    const val = await this.page.$eval(params.selector, el => el.textContent);
                    this.data[params.key] = val;
                }
                break;

            case 'wait':
                await new Promise(r => setTimeout(r, 2000));
                break;
        }
    }

    async cleanup() {
        console.log("🧹 Cleaning up resources...");
        if (this.session?.id) {
            await this.client.sessions.release(this.session.id);
        }
        console.log("✅ Cleanup Complete");
    }
}
