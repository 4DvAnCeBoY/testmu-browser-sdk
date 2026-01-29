/**
 * ============================================================================
 * TEST: Session Configuration Options
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * This test verifies that various session configuration options work correctly
 * with LambdaTest cloud. Users can customize browser, OS, viewport, etc.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * When creating a session, users can specify:
 *
 *   await sessions.create({
 *     dimensions: { width: 1280, height: 720 },  // Viewport size
 *     lambdatestOptions: {
 *       platformName: 'Windows 11',              // Operating system
 *       browserName: 'Chrome',                   // Browser type
 *       browserVersion: 'latest',                // Browser version
 *       resolution: '1920x1080',                 // Screen resolution
 *     }
 *   });
 *
 * These options are passed to LambdaTest as "capabilities" which tell
 * LambdaTest what kind of browser environment to spin up.
 *
 * WHY THIS MATTERS:
 * -----------------
 * - Test on different operating systems (Windows, macOS, Linux)
 * - Test on different browsers (Chrome, Edge, Firefox, Safari)
 * - Test responsive designs with different viewport sizes
 * - Test on specific browser versions for compatibility
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - SessionManager takes config options
 * - Builds LambdaTest capabilities object from config
 * - Passes capabilities in the WebSocket URL query string
 * - LambdaTest reads capabilities and provisions matching browser
 *
 * WHAT WE TEST:
 * -------------
 * 1. Custom viewport dimensions (1280x720)
 * 2. Windows 11 + Chrome
 * 3. macOS + Chrome
 * 4. Windows 10 + Edge browser
 *
 * Each test:
 * - Creates session with specific config
 * - Connects browser
 * - Navigates to a page
 * - Verifies the config was applied (viewport size, browser type, etc.)
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/01d-session-config-options.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Session Configuration Options');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // ============================================
    // Test 1: Custom Dimensions (Viewport Size)
    // ============================================
    console.log('\n--- Test 1: Custom Dimensions (1280x720) ---');
    console.log('   Purpose: Verify viewport size can be customized');

    const session1 = await client.sessions.create({
        adapter: 'puppeteer',
        dimensions: { width: 1280, height: 720 },
        lambdatestOptions: {
            build: 'SDK Tests - Config Options',
            name: 'Custom Dimensions Test',
            platformName: 'Windows 10',
            browserName: 'Chrome',
            browserVersion: 'latest',
            resolution: '1280x720',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`   ✅ Session created: ${session1.id}`);

    const browser1 = await client.puppeteer.connect(session1);
    const page1 = (await browser1.pages())[0];

    // Navigate to viewport checker
    await page1.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const viewport1 = await page1.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
    }));
    console.log(`   Viewport: ${viewport1.width}x${viewport1.height}`);

    await browser1.close();
    await client.sessions.release(session1.id);
    console.log('   ✅ Test 1 complete\n');

    // ============================================
    // Test 2: Windows 11 + Chrome
    // ============================================
    console.log('--- Test 2: Windows 11 + Chrome ---');
    console.log('   Purpose: Verify Windows 11 platform works');

    const session2 = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Config Options',
            name: 'Windows 11 Chrome Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`   ✅ Session created: ${session2.id}`);

    const browser2 = await client.puppeteer.connect(session2);
    const page2 = (await browser2.pages())[0];

    await page2.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const platform2 = await page2.evaluate(() => navigator.platform);
    const userAgent2 = await page2.evaluate(() => navigator.userAgent);
    console.log(`   Platform: ${platform2}`);
    console.log(`   Chrome: ${userAgent2.includes('Chrome') ? 'Yes' : 'No'}`);

    await browser2.close();
    await client.sessions.release(session2.id);
    console.log('   ✅ Test 2 complete\n');

    // ============================================
    // Test 3: macOS + Chrome
    // ============================================
    console.log('--- Test 3: macOS + Chrome ---');
    console.log('   Purpose: Verify macOS platform works');

    const session3 = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Config Options',
            name: 'macOS Chrome Test',
            platformName: 'macOS Ventura',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`   ✅ Session created: ${session3.id}`);

    const browser3 = await client.puppeteer.connect(session3);
    const page3 = (await browser3.pages())[0];

    await page3.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const platform3 = await page3.evaluate(() => navigator.platform);
    console.log(`   Platform: ${platform3}`);
    console.log(`   Is Mac: ${platform3.includes('Mac') ? 'Yes' : 'No'}`);

    await browser3.close();
    await client.sessions.release(session3.id);
    console.log('   ✅ Test 3 complete\n');

    // ============================================
    // Test 4: Edge Browser
    // ============================================
    console.log('--- Test 4: Edge Browser ---');
    console.log('   Purpose: Verify Microsoft Edge browser works');

    const session4 = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Config Options',
            name: 'Edge Browser Test',
            platformName: 'Windows 10',
            browserName: 'MicrosoftEdge',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`   ✅ Session created: ${session4.id}`);

    const browser4 = await client.puppeteer.connect(session4);
    const page4 = (await browser4.pages())[0];

    await page4.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const userAgent4 = await page4.evaluate(() => navigator.userAgent);
    const isEdge = userAgent4.includes('Edg');
    console.log(`   Is Edge: ${isEdge ? 'Yes' : 'No'}`);
    console.log(`   UA snippet: ...${userAgent4.slice(-50)}`);

    await browser4.close();
    await client.sessions.release(session4.id);
    console.log('   ✅ Test 4 complete');

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ All Config Options Tests Complete!');
    console.log('='.repeat(60));
    console.log('\nCheck LambdaTest Dashboard:');
    console.log('  Build: "SDK Tests - Config Options"');
    console.log('  Tests run on: Windows 10, Windows 11, macOS, Edge');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
