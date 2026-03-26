/**
 * ============================================================================
 * TEST: Quick Action - Scrape (LambdaTest Cloud)
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * The scrape() method extracts content from any webpage using a LambdaTest
 * cloud browser session. Uses session-based mode for cloud execution.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. Create a LambdaTest cloud session
 * 2. Connect via Puppeteer and register the page
 * 3. Call client.scrape({ url, sessionId }) - uses cloud browser
 * 4. Navigates to the URL on LambdaTest cloud browser
 * 5. Extracts content based on format option:
 *    - 'html': Raw HTML of the page
 *    - 'text': Plain text content (no HTML tags)
 *    - 'readability': Main article content (removes nav, ads, etc.)
 * 6. Returns { title, content, url, metadata }
 *
 * WHY THIS MATTERS:
 * -----------------
 * - Scrape from cloud browsers (different IPs, no local detection)
 * - Reuse existing cloud sessions for multiple operations
 * - Consistent environment across all tests
 * - Visible on LambdaTest dashboard for debugging
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - QuickActionsService.scrape() in services/quick-actions.ts
 * - registerSessionPage(sessionId, page) stores the cloud page
 * - getPage(sessionId) returns the registered cloud page
 * - All navigation happens on LambdaTest cloud browser
 *
 * WHAT WE TEST:
 * -------------
 * 1. Scrape with format: 'html' - returns raw HTML
 * 2. Scrape with format: 'text' - returns plain text
 * 3. Scrape with format: 'readability' - returns main content
 * 4. Scrape with delay option - waits before extracting
 * 5. Metadata extraction - gets page meta tags
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/02a-quick-scrape.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Quick Action - Scrape (LambdaTest Cloud)');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Create LambdaTest session
    console.log('\nCreating LambdaTest session...');
    const session = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Quick Actions',
            name: 'Scrape Tests',
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
        // Test 1: Scrape as HTML
        // ============================================
        console.log('--- Test 1: Scrape as HTML ---');
        console.log('   URL: https://quotes.toscrape.com');
        console.log('   Format: html');

        const htmlResult = await client.scrape({
            url: 'https://quotes.toscrape.com',
            format: 'html',
            sessionId: session.id
        });

        console.log(`   ✅ Title: ${htmlResult.title}`);
        console.log(`   Content length: ${htmlResult.content.length} chars`);
        console.log(`   Contains <html>: ${htmlResult.content.includes('<html') ? 'Yes' : 'No'}`);
        console.log(`   Contains <div>: ${htmlResult.content.includes('<div') ? 'Yes' : 'No'}`);

        // ============================================
        // Test 2: Scrape as Text
        // ============================================
        console.log('\n--- Test 2: Scrape as Text ---');
        console.log('   URL: https://quotes.toscrape.com');
        console.log('   Format: text');

        const textResult = await client.scrape({
            url: 'https://quotes.toscrape.com',
            format: 'text',
            sessionId: session.id
        });

        console.log(`   ✅ Title: ${textResult.title}`);
        console.log(`   Content length: ${textResult.content.length} chars`);
        console.log(`   Contains HTML tags: ${textResult.content.includes('<div') ? 'Yes (bad)' : 'No (good)'}`);
        console.log(`   Sample: "${textResult.content.substring(0, 100).replace(/\n/g, ' ')}..."`);

        // ============================================
        // Test 3: Scrape as Readability
        // ============================================
        console.log('\n--- Test 3: Scrape as Readability ---');
        console.log('   URL: https://quotes.toscrape.com');
        console.log('   Format: readability');

        const readableResult = await client.scrape({
            url: 'https://quotes.toscrape.com',
            format: 'readability',
            sessionId: session.id
        });

        console.log(`   ✅ Title: ${readableResult.title}`);
        console.log(`   Content length: ${readableResult.content.length} chars`);
        console.log(`   Sample: "${readableResult.content.substring(0, 100).replace(/\n/g, ' ')}..."`);

        // ============================================
        // Test 4: Scrape with Delay
        // ============================================
        console.log('\n--- Test 4: Scrape with Delay ---');
        console.log('   URL: https://news.ycombinator.com');
        console.log('   Delay: 2000ms');

        const startTime = Date.now();
        const delayResult = await client.scrape({
            url: 'https://news.ycombinator.com',
            format: 'text',
            delay: 2000,
            sessionId: session.id
        });
        const elapsed = Date.now() - startTime;

        console.log(`   ✅ Title: ${delayResult.title}`);
        console.log(`   Elapsed time: ${elapsed}ms (should be > 2000ms)`);
        console.log(`   Delay respected: ${elapsed > 2000 ? 'Yes' : 'No'}`);

        // ============================================
        // Test 5: Metadata Extraction
        // ============================================
        console.log('\n--- Test 5: Metadata Extraction ---');
        console.log('   URL: https://www.github.com');

        const metaResult = await client.scrape({
            url: 'https://www.github.com',
            format: 'html',
            sessionId: session.id
        });

        console.log(`   ✅ Title: ${metaResult.title}`);
        if (metaResult.metadata && Object.keys(metaResult.metadata).length > 0) {
            console.log('   Metadata found:');
            const entries = Object.entries(metaResult.metadata).slice(0, 5);
            entries.forEach(([key, value]) => {
                const truncated = String(value).substring(0, 50);
                console.log(`     - ${key}: ${truncated}...`);
            });
        } else {
            console.log('   No metadata found');
        }

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ All Scrape Tests Complete!');
        console.log('='.repeat(60));

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
    console.log('  client.scrape({ url, format: "html", sessionId })');
    console.log('  client.scrape({ url, format: "text", sessionId })');
    console.log('  client.scrape({ url, format: "readability", sessionId })');
    console.log('  client.scrape({ url, delay: 2000, sessionId })');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
