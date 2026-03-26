import { BrowserAgent } from './agent.js';

async function main() {
    const agent = new BrowserAgent();

    try {
        await agent.init();

        const result = await agent.run(
            "Find the top story on Hacker News and extract its title.",
            "https://news.ycombinator.com/"
        );

        console.log("\n====== REPORT ======");
        console.log("Success:", result.success);
        console.log("Extracted Data:", result.data);
        console.log("History:", result.history.map(h => `${h.action}: ${h.thought}`).join('\n'));
        console.log("====================");

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

main().catch(console.error);
