/**
 * ============================================================================
 * TEST: Quick Action - PDF (LambdaTest Cloud)
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * The pdf() method generates a PDF document from any webpage using a
 * LambdaTest cloud browser session. Uses session-based mode for cloud execution.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. Create a LambdaTest cloud session
 * 2. Connect via Puppeteer and register the page
 * 3. Call client.pdf({ url, sessionId }) - uses cloud browser
 * 4. Navigates to the URL on LambdaTest cloud browser
 * 5. Generates PDF with options:
 *    - format: 'A4', 'Letter', 'Legal', etc.
 *    - landscape: true/false
 *    - printBackground: true/false (include CSS backgrounds)
 *    - margin: { top, right, bottom, left }
 * 6. Returns { data: Buffer, pageCount }
 *
 * WHY THIS MATTERS:
 * -----------------
 * - Generate PDFs from cloud browsers
 * - Consistent rendering across different platforms
 * - Reuse existing cloud sessions for multiple PDF generations
 * - Visible on LambdaTest dashboard for debugging
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - QuickActionsService.pdf() in services/quick-actions.ts
 * - registerSessionPage(sessionId, page) stores the cloud page
 * - getPage(sessionId) returns the registered cloud page
 * - Uses page.pdf() on cloud browser
 *
 * WHAT WE TEST:
 * -------------
 * 1. Basic PDF - A4 format
 * 2. Letter format with landscape orientation
 * 3. PDF with custom margins
 * 4. PDF with background colors/images
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/02c-quick-pdf.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs';
import * as path from 'path';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Quick Action - PDF (LambdaTest Cloud)');
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
            name: 'PDF Tests',
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
        // Test 1: Basic PDF (A4)
        // ============================================
        console.log('--- Test 1: Basic PDF (A4) ---');
        console.log('   URL: https://quotes.toscrape.com');
        console.log('   Format: A4');

        const basicResult = await client.pdf({
            url: 'https://quotes.toscrape.com',
            format: 'A4',
            sessionId: session.id
        });

        if ('data' in basicResult && basicResult.data) {
            const filePath = path.join(outputDir, 'pdf-basic-a4.pdf');
            fs.writeFileSync(filePath, basicResult.data);
            console.log(`   ✅ Size: ${basicResult.data.length} bytes`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Test 2: Letter Format, Landscape
        // ============================================
        console.log('\n--- Test 2: Letter Format, Landscape ---');
        console.log('   URL: https://news.ycombinator.com');
        console.log('   Format: Letter, Landscape: true');

        const landscapeResult = await client.pdf({
            url: 'https://news.ycombinator.com',
            format: 'Letter',
            landscape: true,
            sessionId: session.id
        });

        if ('data' in landscapeResult && landscapeResult.data) {
            const filePath = path.join(outputDir, 'pdf-landscape.pdf');
            fs.writeFileSync(filePath, landscapeResult.data);
            console.log(`   ✅ Size: ${landscapeResult.data.length} bytes`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Test 3: PDF with Custom Margins
        // ============================================
        console.log('\n--- Test 3: PDF with Custom Margins ---');
        console.log('   URL: https://www.github.com');
        console.log('   Margins: 1 inch all around');

        const marginResult = await client.pdf({
            url: 'https://www.github.com',
            format: 'A4',
            margin: {
                top: '1in',
                right: '1in',
                bottom: '1in',
                left: '1in'
            },
            sessionId: session.id
        });

        if ('data' in marginResult && marginResult.data) {
            const filePath = path.join(outputDir, 'pdf-margins.pdf');
            fs.writeFileSync(filePath, marginResult.data);
            console.log(`   ✅ Size: ${marginResult.data.length} bytes`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Test 4: PDF with Background
        // ============================================
        console.log('\n--- Test 4: PDF with Background ---');
        console.log('   URL: https://www.google.com');
        console.log('   Print background: true');

        const bgResult = await client.pdf({
            url: 'https://www.google.com',
            format: 'A4',
            printBackground: true,
            sessionId: session.id
        });

        if ('data' in bgResult && bgResult.data) {
            const filePath = path.join(outputDir, 'pdf-background.pdf');
            fs.writeFileSync(filePath, bgResult.data);
            console.log(`   ✅ Size: ${bgResult.data.length} bytes`);
            console.log(`   Saved to: ${filePath}`);
        } else {
            console.log('   ❌ No data returned');
        }

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ All PDF Tests Complete!');
        console.log('='.repeat(60));
        console.log(`\nPDFs saved to: ${outputDir}`);

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
    console.log('  client.pdf({ url, format: "A4", sessionId })');
    console.log('  client.pdf({ url, format: "Letter", landscape: true, sessionId })');
    console.log('  client.pdf({ url, margin: { top: "1in", ... }, sessionId })');
    console.log('  client.pdf({ url, printBackground: true, sessionId })');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
