/**
 * AI Agent with Computer Actions - Real Website Automation
 * 
 * This example demonstrates the `sessions.computer()` API for AI agent control
 * using real websites and LambdaTest cloud automation.
 * 
 * Real Websites Used:
 * - https://duckduckgo.com (Search engine interaction)
 * - https://www.google.com (Navigation and typing)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/ai-agent-computer-actions.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

// LambdaTest credentials
const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

async function main() {
    console.log("🤖 AI Agent Computer Actions - Real Website Automation\n");
    console.log("═".repeat(60));

    const client = new testMuBrowser();

    // ========================================
    // 1. Create LambdaTest Cloud Session
    // ========================================
    console.log("\n📱 Creating LambdaTest cloud session...");

    const session = await client.sessions.create({
        // LambdaTest Configuration
        lambdatestOptions: {
            build: 'AI Agent Demo',
            name: 'Computer Actions Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                resolution: '1920x1080',
                video: true,
                console: true,
                network: true
            }
        },
        // Enhanced session options
        dimensions: { width: 1920, height: 1080 },
        timeout: 600000,
        stealthConfig: {
            humanizeInteractions: true
        }
    });

    console.log(`   Session ID: ${session.id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   View at: https://automation.lambdatest.com/`);

    // Connect via Puppeteer
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];

    // ========================================
    // 2. Navigate to DuckDuckGo (Real Website)
    // ========================================
    console.log("\n🌐 Navigating to DuckDuckGo...");
    await page.goto('https://duckduckgo.com', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="q"]');
    console.log("   ✓ DuckDuckGo loaded");

    // Take initial screenshot
    console.log("\n📸 Taking screenshot of homepage...");
    const homepageScreenshot = await client.sessions.computer(session.id, page, {
        action: 'screenshot'
    });
    console.log(`   Screenshot: ${homepageScreenshot.base64_image?.length || 0} bytes`);

    // ========================================
    // 3. AI Agent: Type Search Query
    // ========================================
    console.log("\n⌨️ AI Agent: Clicking search box...");

    // Get search box position
    const searchBox = await page.$('input[name="q"]');
    const boxPosition = await searchBox?.boundingBox();

    if (boxPosition) {
        // Click on search box
        await client.sessions.computer(session.id, page, {
            action: 'click',
            coordinate: [
                Math.round(boxPosition.x + boxPosition.width / 2),
                Math.round(boxPosition.y + boxPosition.height / 2)
            ]
        });
        console.log("   ✓ Clicked search box");

        // Type search query
        console.log("\n⌨️ AI Agent: Typing search query...");
        await client.sessions.computer(session.id, page, {
            action: 'type',
            text: 'LambdaTest automation testing'
        });
        console.log("   ✓ Typed: 'LambdaTest automation testing'");

        // Screenshot after typing
        const typingScreenshot = await client.sessions.computer(session.id, page, {
            action: 'screenshot'
        });
        console.log(`   Screenshot after typing: ${typingScreenshot.base64_image?.length || 0} bytes`);

        // Press Enter to search
        console.log("\n⏎ AI Agent: Pressing Enter to search...");
        await client.sessions.computer(session.id, page, {
            action: 'key',
            text: 'Enter'
        });
        console.log("   ✓ Search submitted");
    }

    // Wait for search results
    await page.waitForSelector('.result__title', { timeout: 10000 }).catch(() => {
        console.log("   (Waiting for results...)");
    });
    await new Promise(r => setTimeout(r, 2000));

    // ========================================
    // 4. AI Agent: Scroll Through Results
    // ========================================
    console.log("\n📜 AI Agent: Scrolling through results...");

    for (let i = 0; i < 3; i++) {
        await client.sessions.computer(session.id, page, {
            action: 'scroll',
            deltaY: 400
        });
        console.log(`   Scrolled ${(i + 1) * 400}px`);
        await new Promise(r => setTimeout(r, 500));
    }

    // Screenshot of search results
    const resultsScreenshot = await client.sessions.computer(session.id, page, {
        action: 'screenshot'
    });
    console.log(`\n📸 Results screenshot: ${resultsScreenshot.base64_image?.length || 0} bytes`);

    // ========================================
    // 5. Navigate to Google (Second Website)
    // ========================================
    console.log("\n🌐 Navigating to Google...");
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    // Handle potential cookie consent
    try {
        const acceptButton = await page.$('button:has-text("Accept all")');
        if (acceptButton) {
            const box = await acceptButton.boundingBox();
            if (box) {
                await client.sessions.computer(session.id, page, {
                    action: 'click',
                    coordinate: [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]
                });
                console.log("   ✓ Accepted cookies");
            }
        }
    } catch (e) {
        // No cookie dialog
    }

    console.log("   ✓ Google loaded");

    // ========================================
    // 6. Extract Session Context
    // ========================================
    console.log("\n🍪 Extracting session context...");
    const context = await client.sessions.context(session.id, page);
    console.log(`   Cookies: ${context.cookies?.length || 0}`);
    console.log(`   LocalStorage origins: ${Object.keys(context.localStorage || {}).length}`);

    // Get live session details
    console.log("\n📊 Live session details...");
    const liveDetails = await client.sessions.liveDetails(session.id);
    console.log(`   Open pages: ${liveDetails?.pages.length || 0}`);

    // Get recorded events
    const events = client.sessions.events(session.id);
    console.log(`   Recorded events: ${events.length}`);

    // ========================================
    // 7. Cleanup
    // ========================================
    console.log("\n🧹 Cleaning up...");
    await browser.close();
    await client.sessions.release(session.id);

    console.log("\n" + "═".repeat(60));
    console.log("✅ AI Agent Demo Complete!");
    console.log("   View recording at: https://automation.lambdatest.com/");
}

main().catch(console.error);
