/**
 * Quick Actions & Captcha - Real Website Automation
 * 
 * Demonstrates enhanced quick actions (scrape, screenshot, PDF) and
 * captcha solving with real websites on LambdaTest cloud.
 * 
 * Real Websites Used:
 * - https://news.ycombinator.com (News scraping)
 * - https://quotes.toscrape.com (Quote extraction)
 * - https://github.com (Screenshot & PDF)
 * - https://httpbin.org (API testing)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/quick-actions-and-captcha.ts
 */

import { testMuBrowser } from '../src/testMuBrowser/index.js';
import * as fs from 'fs';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

async function main() {
    console.log("⚡ Quick Actions & Captcha - Real Websites\n");
    console.log("═".repeat(60));

    const client = new testMuBrowser();

    // ========================================
    // Part 1: Scraping Hacker News
    // ========================================
    console.log("\n📄 Part 1: Scraping Hacker News");
    console.log("─".repeat(50));

    console.log("\n🔍 Scraping Hacker News homepage...");
    const hnScrape = await client.quick.scrape({
        url: 'https://news.ycombinator.com',
        delay: 2000,
        format: 'text'
    });

    console.log(`   Title: ${hnScrape.title}`);
    console.log(`   URL: ${hnScrape.url}`);
    console.log(`   Content preview:`);
    console.log(`   "${hnScrape.content.substring(0, 200).replace(/\n/g, ' ')}..."`);

    // Extract with metadata
    console.log("\n📊 Extracting with metadata...");
    const hnWithMeta = await client.quick.scrape({
        url: 'https://news.ycombinator.com',
        format: 'html'
    });
    console.log(`   HTML length: ${hnWithMeta.content.length} chars`);
    if (hnWithMeta.metadata) {
        for (const [key, value] of Object.entries(hnWithMeta.metadata).slice(0, 3)) {
            console.log(`     ${key}: ${value.substring(0, 40)}...`);
        }
    }

    // ========================================
    // Part 2: Scraping Quotes to Scrape
    // ========================================
    console.log("\n\n📜 Part 2: Scraping Quotes Website");
    console.log("─".repeat(50));

    console.log("\n🔍 Scraping quotes.toscrape.com...");
    const quotesScrape = await client.quick.scrape({
        url: 'https://quotes.toscrape.com',
        delay: 1000,
        format: 'text'
    });

    console.log(`   Title: ${quotesScrape.title}`);
    console.log(`   Sample quotes:`);
    const lines = quotesScrape.content.split('\n').filter(l => l.includes('"')).slice(0, 3);
    lines.forEach(line => console.log(`     ${line.trim().substring(0, 60)}...`));

    // Readability format
    console.log("\n📖 Using readability format...");
    const quotesReadable = await client.quick.scrape({
        url: 'https://quotes.toscrape.com/page/2/',
        format: 'readability'
    });
    console.log(`   Readable content length: ${quotesReadable.content.length} chars`);

    // ========================================
    // Part 3: Screenshots with LambdaTest
    // ========================================
    console.log("\n\n📸 Part 3: Screenshots");
    console.log("─".repeat(50));

    // Create LambdaTest session for screenshots
    const session = await client.sessions.create({
        lambdatestOptions: {
            build: 'Quick Actions Demo',
            name: 'Screenshot Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        },
        dimensions: { width: 1920, height: 1080 }
    });

    console.log(`   Session ID: ${session.id}`);
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];

    // Register page for session-based quick actions
    client.quick.registerSessionPage(session.id, page);

    // GitHub homepage screenshot
    console.log("\n📸 Capturing GitHub homepage...");
    await page.goto('https://github.com', { waitUntil: 'networkidle2' });

    const githubScreen = await client.quick.screenshot({
        url: 'https://github.com',
        sessionId: session.id,
        fullPage: false,
        format: 'png'
    });
    if ('data' in githubScreen) {
        console.log(`   ✓ Size: ${githubScreen.data.length} bytes`);
        console.log(`   Format: ${githubScreen.format}`);
        // Optionally save: fs.writeFileSync('github-screenshot.png', githubScreen.data);
    }

    // Full page screenshot of Hacker News
    console.log("\n📸 Full page screenshot of Hacker News...");
    const hnScreen = await client.quick.screenshot({
        url: 'https://news.ycombinator.com',
        fullPage: true,
        delay: 1000
    });
    if ('data' in hnScreen) {
        console.log(`   ✓ Full page size: ${hnScreen.data.length} bytes`);
    }

    // ========================================
    // Part 4: PDF Generation
    // ========================================
    console.log("\n\n📑 Part 4: PDF Generation");
    console.log("─".repeat(50));

    // GitHub PDF
    console.log("\n📄 Generating GitHub homepage PDF...");
    const githubPdf = await client.quick.pdf({
        url: 'https://github.com',
        format: 'A4',
        printBackground: true,
        margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
        }
    });
    if ('data' in githubPdf) {
        console.log(`   ✓ PDF size: ${githubPdf.data.length} bytes`);
        // Optionally save: fs.writeFileSync('github.pdf', githubPdf.data);
    }

    // HTTPBin PDF (API documentation)
    console.log("\n📄 Generating HTTPBin PDF...");
    const httpbinPdf = await client.quick.pdf({
        url: 'https://httpbin.org',
        format: 'Letter',
        landscape: true
    });
    if ('data' in httpbinPdf) {
        console.log(`   ✓ PDF size: ${httpbinPdf.data.length} bytes`);
    }

    // ========================================
    // Part 5: Session-based Quick Actions
    // ========================================
    console.log("\n\n🔗 Part 5: Session-based Quick Actions");
    console.log("─".repeat(50));

    // Navigate to quotes page in existing session
    console.log("\n🌐 Using existing session for automation...");
    await page.goto('https://quotes.toscrape.com', { waitUntil: 'networkidle2' });

    // Click through pages using computer actions
    console.log("   Clicking 'Next' button...");
    const nextButton = await page.$('.next a');
    if (nextButton) {
        const box = await nextButton.boundingBox();
        if (box) {
            await client.sessions.computer(session.id, page, {
                action: 'click',
                coordinate: [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]
            });
        }
    }
    await new Promise(r => setTimeout(r, 1000));

    // Scrape page 2 using session
    const page2Scrape = await client.quick.scrape({
        url: page.url(),
        sessionId: session.id,
        format: 'text'
    });
    console.log(`   ✓ Scraped page 2: ${page2Scrape.content.substring(0, 100)}...`);

    // ========================================
    // Part 6: Captcha Integration
    // ========================================
    console.log("\n\n🔐 Part 6: Captcha Integration");
    console.log("─".repeat(50));

    console.log("\n⚠️  Note: Real captcha solving requires API key.");
    console.log("   Set CAPTCHA_API_KEY and CAPTCHA_SERVICE env vars.");

    // Navigate to a page with potential captcha
    await page.goto('https://www.google.com/recaptcha/api2/demo', { waitUntil: 'networkidle2' });
    console.log("\n🌐 Navigated to reCAPTCHA demo page...");

    // Request captcha solve
    console.log("\n🧩 Requesting captcha solve...");
    const solveResult = await client.sessions.captchas.solveImage(session.id, {
        selector: '.recaptcha-checkbox',
        type: 'recaptcha',
        pageUrl: page.url()
    });
    console.log(`   Job ID: ${solveResult.id}`);
    console.log(`   Status: ${solveResult.status}`);

    // Wait and check status
    console.log("\n⏳ Checking solve status...");
    await new Promise(r => setTimeout(r, 3000));

    const captchaStatus = await client.sessions.captchas.status(session.id);
    console.log(`   Status: ${captchaStatus.status}`);
    if (captchaStatus.solution) {
        console.log(`   Solution: ${captchaStatus.solution.substring(0, 30)}...`);
    }
    if (captchaStatus.solvingTime) {
        console.log(`   Solving time: ${captchaStatus.solvingTime}ms`);
    }

    // ========================================
    // Cleanup
    // ========================================
    console.log("\n\n🧹 Cleanup");
    console.log("─".repeat(50));

    client.quick.unregisterSessionPage(session.id);
    await browser.close();
    await client.sessions.release(session.id);

    console.log("\n" + "═".repeat(60));
    console.log("✅ Quick Actions & Captcha Demo Complete!");
    console.log("   View recording at: https://automation.lambdatest.com/");
    console.log("\n📋 Quick Actions Summary:");
    console.log("   client.scrape(url | params)     - Extract page content");
    console.log("   client.screenshot(url | params) - Capture screenshots");
    console.log("   client.pdf(url | params)        - Generate PDFs");
}

main().catch(console.error);
