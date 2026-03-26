/**
 * ============================================================================
 * TEST: Quick Action - Screenshot (LambdaTest Cloud)
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * The screenshot() method captures a screenshot of any webpage using a
 * LambdaTest cloud browser session. Uses session-based mode for cloud execution.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. Create a LambdaTest cloud session
 * 2. Connect via Puppeteer and register the page
 * 3. Call client.screenshot({ url, sessionId }) - uses cloud browser
 * 4. Navigates to the URL on LambdaTest cloud browser
 * 5. Takes screenshot with options:
 *    - fullPage: true/false (capture entire scrollable page or just viewport)
 *    - format: 'png', 'jpeg', 'webp'
 *    - quality: 0-100 (for jpeg/webp)
 * 6. Returns { data: Buffer, format, width, height }
 *
 * WHY THIS MATTERS:
 * -----------------
 * - Capture screenshots from cloud browsers
 * - Test visual rendering on different platforms
 * - Reuse existing cloud sessions for multiple screenshots
 * - Visible on LambdaTest dashboard for debugging
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - QuickActionsService.screenshot() in services/quick-actions.ts
 * - registerSessionPage(sessionId, page) stores the cloud page
 * - getPage(sessionId) returns the registered cloud page
 * - Uses page.screenshot() on cloud browser
 *
 * WHAT WE TEST:
 * -------------
 * 1. Basic screenshot - viewport only
 * 2. Full page screenshot - entire scrollable content
 * 3. JPEG format with quality setting
 * 4. Screenshot with delay - waits before capture
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/02b-quick-screenshot.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs';
import * as path from 'path';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Quick Action - Screenshot (LambdaTest Cloud)');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Create output directory
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    console.log(`\nOutput directory: ${outputDir}`);

    // Create LambdaTest session
    console.log('\nCreating LambdaTest session...');
    const session = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Quick Actions',
            name: 'Screenshot Tests',
            platformName: 'Windows 10',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`✅ Session created: ${session.id}`);

    // Connect via Puppeteer
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];

    // Register the page for quick actions
    client.quick.registerSessionPage(session.id, page);
    console.log('✅ Page registered for quick actions\n');

    try {
        // ============================================
        // Test 1: Basic Screenshot (Viewport)
        // ============================================
        console.log('--- Test 1: Basic Screenshot (Viewport) ---');
        console.log('   URL: https://www.google.com');
        console.log('   Full page: false');

        const basicResult = await client.screenshot({
            url: 'https://www.google.com',
            fullPage: false,
            sessionId: session.id
        });

        if ('data' in basicResult && basicResult.data) {
            const filePath = path.join(outputDir, 'screenshot-viewport.png');
            fs.writeFileSync(filePath, basicResult.data);
            console.log(`   ✅ Size: ${basicResult.data.length} bytes`);
            console.log(`   Format: ${basicResult.format}`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Test 2: Full Page Screenshot
        // ============================================
        console.log('\n--- Test 2: Full Page Screenshot ---');
        console.log('   URL: https://news.ycombinator.com');
        console.log('   Full page: true');

        const fullPageResult = await client.screenshot({
            url: 'https://news.ycombinator.com',
            fullPage: true,
            sessionId: session.id
        });

        if ('data' in fullPageResult && fullPageResult.data) {
            const filePath = path.join(outputDir, 'screenshot-fullpage.png');
            fs.writeFileSync(filePath, fullPageResult.data);
            console.log(`   ✅ Size: ${fullPageResult.data.length} bytes`);
            console.log(`   Format: ${fullPageResult.format}`);
            console.log(`   Saved to: ${filePath}`);
            console.log(`   Full page larger: ${fullPageResult.data.length > (basicResult as any).data.length ? 'Yes' : 'No'}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Test 3: JPEG Format with Quality
        // ============================================
        console.log('\n--- Test 3: JPEG Format with Quality ---');
        console.log('   URL: https://www.github.com');
        console.log('   Format: jpeg, Quality: 80');

        const jpegResult = await client.screenshot({
            url: 'https://www.github.com',
            fullPage: false,
            format: 'jpeg',
            quality: 80,
            sessionId: session.id
        });

        if ('data' in jpegResult && jpegResult.data) {
            const filePath = path.join(outputDir, 'screenshot-quality.jpg');
            fs.writeFileSync(filePath, jpegResult.data);
            console.log(`   ✅ Size: ${jpegResult.data.length} bytes`);
            console.log(`   Format: ${jpegResult.format}`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Test 4: Screenshot with Delay
        // ============================================
        console.log('\n--- Test 4: Screenshot with Delay ---');
        console.log('   URL: https://quotes.toscrape.com');
        console.log('   Delay: 2000ms');

        const startTime = Date.now();
        const delayResult = await client.screenshot({
            url: 'https://quotes.toscrape.com',
            fullPage: false,
            delay: 2000,
            sessionId: session.id
        });
        const elapsed = Date.now() - startTime;

        if ('data' in delayResult && delayResult.data) {
            const filePath = path.join(outputDir, 'screenshot-delay.png');
            fs.writeFileSync(filePath, delayResult.data);
            console.log(`   ✅ Size: ${delayResult.data.length} bytes`);
            console.log(`   Elapsed: ${elapsed}ms (should be > 2000ms)`);
            console.log(`   Delay respected: ${elapsed > 2000 ? 'Yes' : 'No'}`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ All Screenshot Tests Complete!');
        console.log('='.repeat(60));
        console.log(`\nScreenshots saved to: ${outputDir}`);

    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        client.quick.unregisterSessionPage(session.id);
        await browser.close();
        await client.sessions.release(session.id);
        console.log('✅ Session cleaned up');
    }

    console.log('\nUsage examples:');
    console.log('  client.quick.registerSessionPage(sessionId, page)');
    console.log('  client.screenshot({ url, fullPage: false, sessionId })');
    console.log('  client.screenshot({ url, fullPage: true, sessionId })');
    console.log('  client.screenshot({ url, format: "jpeg", quality: 80, sessionId })');
    console.log('  client.screenshot({ url, delay: 2000, sessionId })');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
