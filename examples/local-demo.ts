/**
 * Local Browser Demo with LambdaTest Fallback
 * 
 * Demonstrates running testMuBrowser with auto-discovery local browser
 * or falling back to LambdaTest cloud when local is unavailable.
 * 
 * Real Websites Used:
 * - https://bot.sannysoft.com (Stealth detection test)
 * - https://whatismybrowser.com (Browser fingerprint)
 * 
 * Prerequisites (for cloud fallback):
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/local-demo.ts
 */

import { testMuBrowser } from '../src/testMuBrowser/index.js';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

// Set to true to use LambdaTest cloud instead of local
const USE_LAMBDATEST = process.env.USE_LAMBDATEST === 'true';

async function main() {
    console.log("🚀 Local Browser Demo with LambdaTest Integration\n");
    console.log("═".repeat(60));

    const client = new testMuBrowser();
    const profileId = "stealth_test_profile";

    // ========================================
    // 1. Create Session (Local or LambdaTest)
    // ========================================
    console.log("\n📱 Creating session...");
    console.log(`   Mode: ${USE_LAMBDATEST ? 'LambdaTest Cloud' : 'Local Browser'}`);

    const session = await client.sessions.create(
        USE_LAMBDATEST ? {
            // LambdaTest Cloud Configuration
            lambdatestOptions: {
                build: 'Local Demo',
                name: 'Stealth Test',
                platformName: 'Windows 11',
                browserName: 'Chrome',
                browserVersion: 'latest',
                'LT:Options': {
                    username: LT_USERNAME,
                    accessKey: LT_ACCESS_KEY,
                    video: true
                }
            },
            profileId: profileId,
            stealth: true,
            dimensions: { width: 1280, height: 720 },
            timeout: 300000
        } : {
            // Local Browser Configuration
            local: true,
            profileId: profileId,
            stealth: true,
            dimensions: { width: 1280, height: 720 },
            timeout: 300000,
            stealthConfig: {
                humanizeInteractions: true
            }
        }
    );

    console.log(`   Session ID: ${session.id}`);
    console.log(`   WebSocket: ${session.websocketUrl.substring(0, 50)}...`);
    console.log(`   Status: ${session.status}`);

    // ========================================
    // 2. Connect and Navigate
    // ========================================
    console.log("\n🔌 Connecting via Puppeteer adapter...");
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];
    console.log("   ✓ Connected");

    // ========================================
    // 3. Test Stealth Mode
    // ========================================
    console.log("\n🕵️ Testing stealth mode on bot.sannysoft.com...");
    await page.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle2' });
    console.log("   ✓ Loaded bot detection test page");

    // Wait for tests to complete
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot using computer actions
    console.log("\n📸 Capturing stealth test results...");
    const stealthScreenshot = await client.sessions.computer(session.id, page, {
        action: 'screenshot'
    });
    console.log(`   Screenshot: ${stealthScreenshot.base64_image?.length || 0} bytes`);

    // Check some results
    const results = await page.evaluate(() => {
        const checks: { name: string, passed: boolean }[] = [];
        document.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const name = cells[0]?.textContent?.trim() || '';
                const passed = cells[1]?.classList.contains('passed') ||
                    cells[1]?.textContent?.includes('✓') ||
                    !cells[1]?.classList.contains('failed');
                if (name) checks.push({ name, passed });
            }
        });
        return checks.slice(0, 5);
    });

    console.log("\n   Stealth check results:");
    results.forEach(r => console.log(`     ${r.passed ? '✓' : '✗'} ${r.name}`));

    // ========================================
    // 4. Check Browser Fingerprint
    // ========================================
    console.log("\n🔍 Checking browser fingerprint...");
    await page.goto('https://www.whatismybrowser.com', { waitUntil: 'networkidle2' });

    // Wait for detection
    await new Promise(r => setTimeout(r, 2000));

    // Get browser info
    const browserInfo = await page.evaluate(() => {
        const detected = document.querySelector('.detected-column h2')?.textContent;
        return detected || 'Unknown';
    });
    console.log(`   Detected as: ${browserInfo.trim()}`);

    // Screenshot fingerprint page
    const fingerprintScreenshot = await client.sessions.computer(session.id, page, {
        action: 'screenshot'
    });
    console.log(`   Screenshot: ${fingerprintScreenshot.base64_image?.length || 0} bytes`);

    // ========================================
    // 5. Extract Session Context
    // ========================================
    console.log("\n🍪 Extracting session context...");
    const context = await client.sessions.context(session.id, page);
    console.log(`   Cookies: ${context.cookies?.length || 0}`);
    console.log(`   LocalStorage origins: ${Object.keys(context.localStorage || {}).length}`);

    // ========================================
    // 6. Get Session Events
    // ========================================
    const events = client.sessions.events(session.id);
    console.log(`\n📹 Recorded events: ${events.length}`);

    // ========================================
    // 7. Save Profile for Future Sessions
    // ========================================
    console.log("\n💾 Saving profile...");
    await client.profiles.saveProfile(profileId, page);
    console.log(`   ✓ Profile saved: ${profileId}`);

    // ========================================
    // Cleanup
    // ========================================
    console.log("\n🧹 Cleaning up...");
    await browser.close();
    await client.sessions.release(session.id);

    console.log("\n" + "═".repeat(60));
    console.log("✅ Local Demo Complete!");
    if (USE_LAMBDATEST) {
        console.log("   View recording at: https://automation.lambdatest.com/");
    }
    console.log("\n💡 Tips:");
    console.log("   - Set USE_LAMBDATEST=true to run on cloud");
    console.log("   - Profile is persisted for session resumption");
    console.log("   - Stealth mode helps bypass bot detection");
}

main().catch(console.error);
