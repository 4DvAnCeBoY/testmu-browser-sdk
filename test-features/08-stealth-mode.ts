/**
 * ============================================================================
 * TEST: Stealth Mode - Bot Detection Comparison
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * This test compares stealth ON vs OFF across Puppeteer and Playwright adapters
 * by navigating to bot.sannysoft.com and checking key fingerprint evasions.
 *
 * WHAT THIS TEST DOES:
 * --------------------
 * Session 1 (Puppeteer + Stealth ON):
 *   - Connects with stealthConfig enabled
 *   - Navigates to bot.sannysoft.com
 *   - Checks navigator.webdriver, user-agent, viewport
 *   - Takes a screenshot for visual comparison
 *
 * Session 2 (Puppeteer + Stealth OFF):
 *   - Connects with skipFingerprintInjection: true (no stealth)
 *   - Same checks as Session 1
 *   - Screenshots saved side-by-side for comparison
 *
 * Session 3 (Playwright + Stealth ON):
 *   - Connects via Playwright adapter with stealth scripts injected
 *   - Verifies Playwright-side stealth evasions work
 *
 * EXPECTED RESULTS:
 * -----------------
 * Stealth ON:  navigator.webdriver = false, randomized UA + viewport
 * Stealth OFF: navigator.webdriver = true,  default UA + viewport
 *
 * Screenshots saved to test-output/ for visual comparison.
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/08-stealth-mode.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs';
import * as path from 'path';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

const OUTPUT_DIR = path.join(process.cwd(), 'test-output');

interface CheckResult {
    webdriver: boolean | string;
    userAgent: string;
    viewportWidth: number;
    viewportHeight: number;
}

function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
}

function printResult(label: string, result: CheckResult) {
    console.log(`\n   --- ${label} ---`);
    console.log(`   navigator.webdriver : ${result.webdriver}`);
    console.log(`   User-Agent          : ${result.userAgent.substring(0, 60)}...`);
    console.log(`   Viewport            : ${result.viewportWidth}x${result.viewportHeight}`);

    // Pass/fail checks
    const isStealthOn = label.includes('Stealth ON');
    if (isStealthOn) {
        console.log(`   [${result.webdriver === false ? 'PASS' : 'FAIL'}] webdriver should be false`);
    } else {
        console.log(`   [${result.webdriver === true ? 'PASS' : 'INFO'}] webdriver is ${result.webdriver}`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Stealth Mode - Bot Detection Comparison');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\nMissing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    ensureOutputDir();
    const client = new testMuBrowser();

    // =========================================================
    // Session 1: Puppeteer + Stealth ON
    // =========================================================
    console.log('\n--- Session 1: Puppeteer + Stealth ON ---');
    console.log('1. Creating session...');

    const session1 = await client.sessions.create({
        adapter: 'puppeteer',
        stealthConfig: {
            humanizeInteractions: true,
            randomizeUserAgent: true,
            randomizeViewport: true,
        },
        lambdatestOptions: {
            build: 'SDK Tests - Stealth Mode',
            name: 'Puppeteer Stealth ON',
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
    console.log(`   Session created: ${session1.id}`);
    console.log(`   Auto-selected UA: ${session1.userAgent?.substring(0, 50)}...`);

    const browser1 = await client.puppeteer.connect(session1);
    const page1 = (await browser1.pages())[0];

    console.log('2. Navigating to bot.sannysoft.com...');
    await page1.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000)); // Let page render fully

    const result1: CheckResult = await page1.evaluate(() => ({
        webdriver: navigator.webdriver,
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
    }));

    const screenshot1 = await page1.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'stealth-puppeteer-ON.png'), screenshot1);
    console.log('   Screenshot saved: test-output/stealth-puppeteer-ON.png');

    printResult('Puppeteer Stealth ON', result1);
    await browser1.close();
    await client.sessions.release(session1.id);

    // =========================================================
    // Session 2: Puppeteer + Stealth OFF
    // =========================================================
    console.log('\n--- Session 2: Puppeteer + Stealth OFF ---');
    console.log('1. Creating session...');

    const session2 = await client.sessions.create({
        adapter: 'puppeteer',
        stealthConfig: {
            skipFingerprintInjection: true,
            randomizeUserAgent: false,
            randomizeViewport: false,
        },
        lambdatestOptions: {
            build: 'SDK Tests - Stealth Mode',
            name: 'Puppeteer Stealth OFF',
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
    console.log(`   Session created: ${session2.id}`);

    const browser2 = await client.puppeteer.connect(session2);
    const page2 = (await browser2.pages())[0];

    console.log('2. Navigating to bot.sannysoft.com...');
    await page2.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const result2: CheckResult = await page2.evaluate(() => ({
        webdriver: navigator.webdriver,
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
    }));

    const screenshot2 = await page2.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'stealth-puppeteer-OFF.png'), screenshot2);
    console.log('   Screenshot saved: test-output/stealth-puppeteer-OFF.png');

    printResult('Puppeteer Stealth OFF', result2);
    await browser2.close();
    await client.sessions.release(session2.id);

    // =========================================================
    // Session 3: Playwright + Stealth ON
    // =========================================================
    console.log('\n--- Session 3: Playwright + Stealth ON ---');
    console.log('1. Creating session...');

    const session3 = await client.sessions.create({
        adapter: 'playwright',
        stealthConfig: {
            humanizeInteractions: true,
            randomizeUserAgent: true,
            randomizeViewport: true,
        },
        lambdatestOptions: {
            build: 'SDK Tests - Stealth Mode',
            name: 'Playwright Stealth ON',
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
    console.log(`   Session created: ${session3.id}`);
    console.log(`   Auto-selected UA: ${session3.userAgent?.substring(0, 50)}...`);

    const { browser: browser3, page: page3 } = await client.playwright.connect(session3);

    console.log('2. Navigating to bot.sannysoft.com...');
    await page3.goto('https://bot.sannysoft.com', { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const result3: CheckResult = await page3.evaluate(() => ({
        webdriver: (navigator as any).webdriver,
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
    }));

    const screenshot3 = await page3.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'stealth-playwright-ON.png'), screenshot3);
    console.log('   Screenshot saved: test-output/stealth-playwright-ON.png');

    printResult('Playwright Stealth ON', result3);
    await browser3.close();
    await client.sessions.release(session3.id);

    // =========================================================
    // Summary
    // =========================================================
    console.log('\n' + '='.repeat(60));
    console.log('STEALTH MODE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('\n  Puppeteer Stealth ON:');
    console.log(`    webdriver = ${result1.webdriver} ${result1.webdriver === false ? '(PASS)' : '(FAIL)'}`);
    console.log(`    UA randomized = ${result1.userAgent !== result2.userAgent ? 'Yes (PASS)' : 'No (CHECK)'}`);

    console.log('\n  Puppeteer Stealth OFF:');
    console.log(`    webdriver = ${result2.webdriver} (baseline)`);

    console.log('\n  Playwright Stealth ON:');
    console.log(`    webdriver = ${result3.webdriver} ${result3.webdriver === false ? '(PASS)' : '(FAIL)'}`);

    console.log('\n  Screenshots saved to test-output/ for visual comparison.');
    console.log('='.repeat(60));
}

main().catch(err => {
    console.error('\nTest Failed:', err.message);
    process.exit(1);
});
