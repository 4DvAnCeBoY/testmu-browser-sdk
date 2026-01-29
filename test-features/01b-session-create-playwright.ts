/**
 * ============================================================================
 * TEST: Session Creation with Playwright Adapter
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * This test verifies that we can create a browser session on LambdaTest cloud
 * and connect to it using Playwright (alternative to Puppeteer).
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. User calls sessions.create() with adapter: 'playwright'
 * 2. SDK builds a WebSocket URL for LambdaTest's Playwright endpoint
 *    URL format: wss://user:key@cdp.lambdatest.com/playwright?capabilities=...
 * 3. SDK returns a Session object with the WebSocket URL
 * 4. User calls playwright.connect(session) to connect to the browser
 * 5. LambdaTest spins up a real Chrome browser in the cloud
 * 6. User can now automate using Playwright API (different from Puppeteer)
 *
 * WHY PLAYWRIGHT?
 * ---------------
 * - Playwright is Microsoft's browser automation library
 * - Some teams prefer Playwright over Puppeteer
 * - Playwright has built-in waiting, better selectors, multi-browser support
 * - Our SDK supports both - user chooses their preferred tool
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - SessionManager detects adapter: 'playwright' and uses /playwright endpoint
 * - PlaywrightAdapter.connect() uses chromium.connect() from playwright-core
 * - Returns { browser, context, page } tuple (Playwright's structure)
 *
 * WHAT WE TEST:
 * -------------
 * 1. Session is created with Playwright endpoint URL
 * 2. Playwright can connect to the browser
 * 3. Browser can navigate to a real website (google.com)
 * 4. Session can be released/cleaned up
 *
 * EXPECTED RESULT:
 * ----------------
 * - Test passes
 * - LambdaTest Dashboard shows the test with:
 *   - Build: "SDK Tests - Session Creation"
 *   - Name: "Playwright Adapter Test"
 *   - Plugin type: "playwright"
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/01b-session-create-playwright.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Session Creation with Playwright Adapter');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Step 1: Create session with Playwright adapter
    console.log('\n1. Creating session with adapter: playwright...');
    const session = await client.sessions.create({
        adapter: 'playwright',
        lambdatestOptions: {
            build: 'SDK Tests - Session Creation',
            name: 'Playwright Adapter Test',
            platformName: 'Windows 10',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true,
                console: true
            }
        }
    });

    console.log(`   ✅ Session created: ${session.id}`);
    console.log(`   Status: ${session.status}`);

    // Step 2: Connect via Playwright
    console.log('\n2. Connecting via Playwright...');
    const { browser, page } = await client.playwright.connect(session);
    console.log('   ✅ Connected');

    // Step 3: Navigate to Google (proves browser works)
    console.log('\n3. Navigating to google.com...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`   ✅ Page title: ${title}`);

    // Step 4: Verify it's a real browser
    console.log('\n4. Verifying browser...');
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`   User Agent: ${userAgent.substring(0, 50)}...`);

    // Step 5: Cleanup
    console.log('\n5. Cleanup...');
    await browser.close();
    await client.sessions.release(session.id);
    console.log('   ✅ Session released');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Passed!');
    console.log('='.repeat(60));
    console.log('\nCheck LambdaTest Dashboard:');
    console.log('  Build: "SDK Tests - Session Creation"');
    console.log('  Name: "Playwright Adapter Test"');
    console.log('  Plugin should show: playwright');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
