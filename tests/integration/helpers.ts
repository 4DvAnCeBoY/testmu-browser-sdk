/**
 * Shared helpers for integration tests.
 * All tests run against LambdaTest cloud using LT_USERNAME / LT_ACCESS_KEY env vars.
 */

import { Browser, Session } from '../../src/testmu-cloud/index';

// ─── Constants ───────────────────────────────────────────────────────────────

export const TEST_TIMEOUT_MS = 60_000;
export const CLOUD_CONNECT_TIMEOUT_MS = 90_000; // session creation can be slow

export const SITES = {
    SAUCEDEMO: 'https://www.saucedemo.com',
    INTERNET: 'https://the-internet.herokuapp.com',
} as const;

// Credentials for saucedemo
export const SAUCE_USER = 'standard_user';
export const SAUCE_PASS = 'secret_sauce';

// ─── LambdaTest capabilities helper ──────────────────────────────────────────

export function ltOptions(buildName: string, testName: string) {
    return {
        username: process.env.LT_USERNAME,
        accessKey: process.env.LT_ACCESS_KEY,
        resolution: '1920x1080',
        video: true,
        console: true,
        network: true,
        build: buildName,
        name: testName,
    };
}

export function defaultSessionConfig(testName: string, adapter: 'puppeteer' | 'playwright' | 'selenium' = 'playwright') {
    // Format: sdk-{adapter}-{testName}-{HHMMSS}-{4char}  — meaningful + unique
    const ts = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const rand = Math.random().toString(36).slice(2, 6);
    const uniqueName = `sdk-${adapter}-${testName}-${ts}-${rand}`;
    return {
        adapter,
        lambdatestOptions: {
            build: 'browser-cloud-integration',
            name: uniqueName,
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': ltOptions('browser-cloud-integration', uniqueName),
        },
        dimensions: { width: 1920, height: 1080 },
    };
}

// ─── Session lifecycle helpers ────────────────────────────────────────────────

/**
 * Create a session and connect via Playwright.
 * Returns { browser, page, session } and a cleanup() function.
 */
export async function createPlaywrightSession(browser: Browser, testName: string): Promise<{
    session: Session;
    browserInstance: any;
    page: any;
    cleanup: () => Promise<void>;
}> {
    const session = await browser.sessions.create(defaultSessionConfig(testName, 'playwright'));
    const { browser: browserInstance, page } = await browser.playwright.connect(session) as any;
    browser.page.bind(page, session.id);

    const cleanup = async () => {
        try { await browserInstance.close(); } catch { /* ignore */ }
        try { await browser.sessions.release(session.id); } catch { /* ignore */ }
    };

    return { session, browserInstance, page, cleanup };
}

/**
 * Create a session and connect via Puppeteer.
 */
export async function createPuppeteerSession(browser: Browser, testName: string): Promise<{
    session: Session;
    browserInstance: any;
    page: any;
    cleanup: () => Promise<void>;
}> {
    const session = await browser.sessions.create(defaultSessionConfig(testName, 'puppeteer'));
    const browserInstance = await browser.puppeteer.connect(session);
    const pages = await browserInstance.pages();
    const page = pages[0] || await browserInstance.newPage();
    browser.page.bind(page, session.id);

    const cleanup = async () => {
        try { browserInstance.disconnect(); } catch { /* ignore */ }
        try { await browser.sessions.release(session.id); } catch { /* ignore */ }
    };

    return { session, browserInstance, page, cleanup };
}

/**
 * Login to SauceDemo — reusable across tests.
 */
export async function loginToSauceDemo(page: any): Promise<void> {
    await page.goto(SITES.SAUCEDEMO, { waitUntil: 'networkidle' });
    await page.fill('#user-name', SAUCE_USER);
    await page.fill('#password', SAUCE_PASS);
    await page.click('#login-button');
    await page.waitForSelector('.inventory_list');
}

/**
 * Parse JSON from CLI stdout (handles the {success, data} envelope).
 */
export function parseCLIOutput(stdout: string): any {
    const trimmed = stdout.trim();
    return JSON.parse(trimmed);
}

/**
 * Assert env vars are set, skip if not.
 */
export function requireEnvVars(): void {
    if (!process.env.LT_USERNAME || !process.env.LT_ACCESS_KEY) {
        throw new Error('LT_USERNAME and LT_ACCESS_KEY must be set to run integration tests');
    }
}
