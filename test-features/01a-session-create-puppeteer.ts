/**
 * ============================================================================
 * TEST: Session Creation with Puppeteer Adapter
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * This test verifies that we can create a browser session on LambdaTest cloud
 * and connect to it using Puppeteer.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. User calls sessions.create() with adapter: 'puppeteer'
 * 2. SDK builds a WebSocket URL for LambdaTest's Puppeteer endpoint
 *    URL format: wss://user:key@cdp.lambdatest.com/puppeteer?capabilities=...
 * 3. SDK returns a Session object with the WebSocket URL
 * 4. User calls puppeteer.connect(session) to actually connect to the browser
 * 5. LambdaTest spins up a real Chrome browser in the cloud
 * 6. User can now automate the browser using Puppeteer API
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - SessionManager.createSession() builds the WebSocket URL with credentials
 * - PuppeteerAdapter.connect() uses puppeteer-extra with stealth plugin
 * - Connection is made via puppeteer.connect({ browserWSEndpoint: url })
 *
 * WHAT WE TEST:
 * -------------
 * 1. Session is created with valid ID and WebSocket URL
 * 2. Puppeteer can connect to the browser
 * 3. Browser can navigate to a real website (google.com)
 * 4. Session can be released/cleaned up
 *
 * EXPECTED RESULT:
 * ----------------
 * - Test passes
 * - LambdaTest Dashboard shows the test with:
 *   - Build: "SDK Tests - Session Creation"
 *   - Name: "Puppeteer Adapter Test"
 *   - Plugin type: "puppeteer"
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/01a-session-create-puppeteer.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Session Creation with Puppeteer Adapter');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Step 1: Create session with Puppeteer adapter
    console.log('\n1. Creating session with adapter: puppeteer...');
    const session = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Session Creation',
            name: 'Puppeteer Adapter Test',
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

    // Step 2: Connect via Puppeteer
    console.log('\n2. Connecting via Puppeteer...');
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];
    console.log('   ✅ Connected');

    // Step 3: Navigate to Google (proves browser works)
    console.log('\n3. Navigating to google.com...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
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
    console.log('  Name: "Puppeteer Adapter Test"');
    console.log('  Plugin should show: puppeteer');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
