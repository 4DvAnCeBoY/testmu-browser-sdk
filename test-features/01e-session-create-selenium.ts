/**
 * ============================================================================
 * TEST: Session Creation with Selenium Adapter
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * This test verifies that we can create a browser session on LambdaTest cloud
 * and connect to it using Selenium WebDriver.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. User calls sessions.create() with adapter: 'selenium'
 * 2. SDK builds a Session object with connection info
 * 3. User calls selenium.connect(session) — returns a Selenium WebDriver
 * 4. The adapter connects to LambdaTest Selenium Hub via HTTP (not WebSocket)
 * 5. User can now automate the browser using Selenium WebDriver API
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - SessionManager.createSession() creates the session with config
 * - SeleniumAdapter.connect() builds W3C capabilities and connects to
 *   https://hub.lambdatest.com/wd/hub via selenium-webdriver Builder
 * - Credentials are read from LT_USERNAME / LT_ACCESS_KEY env vars
 *
 * WHAT WE TEST:
 * -------------
 * 1. Session is created with valid ID
 * 2. Selenium WebDriver connects to the browser
 * 3. Browser can navigate to a real website (google.com)
 * 4. Page title can be retrieved
 * 5. Screenshot can be taken
 * 6. Session can be released/cleaned up
 *
 * EXPECTED RESULT:
 * ----------------
 * - Test passes
 * - LambdaTest Dashboard shows the test with:
 *   - Build: "SDK Tests - Session Creation"
 *   - Name: "Selenium Adapter Test"
 *   - Plugin type: "selenium"
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/01e-session-create-selenium.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Session Creation with Selenium Adapter');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Step 1: Create session with Selenium adapter
    console.log('\n1. Creating session with adapter: selenium...');
    const session = await client.sessions.create({
        adapter: 'selenium',
        lambdatestOptions: {
            build: 'SDK Tests - Session Creation',
            name: 'Selenium Adapter Test',
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

    // Step 2: Connect via Selenium WebDriver
    console.log('\n2. Connecting via Selenium WebDriver...');
    const driver = await client.selenium.connect(session);
    console.log('   ✅ Connected');
    if (session.sessionViewerUrl) {
        console.log(`   Dashboard: ${session.sessionViewerUrl}`);
    }

    // Step 3: Navigate to Google (proves browser works)
    console.log('\n3. Navigating to google.com...');
    await driver.get('https://www.google.com');
    const title = await driver.getTitle();
    console.log(`   ✅ Page title: ${title}`);

    // Step 4: Take a screenshot
    console.log('\n4. Taking screenshot...');
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync('selenium-screenshot.png', screenshot, 'base64');
    console.log('   ✅ Screenshot saved to selenium-screenshot.png');

    // Step 5: Cleanup
    console.log('\n5. Cleanup...');
    await driver.quit();
    await client.sessions.release(session.id);
    console.log('   ✅ Session released');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Passed!');
    console.log('='.repeat(60));
    console.log('\nCheck LambdaTest Dashboard:');
    console.log('  Build: "SDK Tests - Session Creation"');
    console.log('  Name: "Selenium Adapter Test"');
    console.log('  Plugin should show: selenium');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
