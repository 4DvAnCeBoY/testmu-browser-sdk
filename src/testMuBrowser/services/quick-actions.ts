import puppeteer, { Page, Browser } from 'puppeteer-core';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {
    ScrapeParams,
    ScrapeResponse,
    ScreenshotParams,
    ScreenshotResponse,
    PdfParams,
    PdfResponse
} from '../types.js';

puppeteerExtra.use(StealthPlugin());

/**
 * QuickActionsService - Steel-compatible Quick Actions
 * 
 * Provides quick operations for scraping, screenshots, and PDFs.
 * Can operate standalone or use existing sessions.
 */
export class QuickActionsService {
    private sessionPages: Map<string, Page> = new Map();

    /**
     * Register a page for a session (for session-based quick actions)
     */
    registerSessionPage(sessionId: string, page: Page): void {
        this.sessionPages.set(sessionId, page);
    }

    /**
     * Unregister a session page
     */
    unregisterSessionPage(sessionId: string): void {
        this.sessionPages.delete(sessionId);
    }

    /**
     * Get a page - either from existing session or create transient browser
     */
    private async getPage(sessionId?: string): Promise<{ page: Page; cleanup: () => Promise<void> }> {
        if (sessionId && this.sessionPages.has(sessionId)) {
            // Use existing session page
            const page = this.sessionPages.get(sessionId)!;
            return {
                page,
                cleanup: async () => { } // No cleanup needed for existing session
            };
        }

        // Get Chrome executable path using chrome-launcher (dynamic import for ESM)
        const Launcher = await import('chrome-launcher');
        const installations = Launcher.Launcher.getInstallations();
        const chromePath = installations.length > 0 ? installations[0] : undefined;

        if (!chromePath) {
            throw new Error('Chrome not found. Please install Chrome or use a session-based quick action.');
        }

        // Launch transient browser with Chrome path
        const browser = await puppeteerExtra.launch({
            headless: true,
            executablePath: chromePath
        });
        const page = await browser.newPage();

        return {
            page: page as Page,
            cleanup: async () => {
                await browser.close();
            }
        };
    }

    /**
     * Wait for page to be ready
     */
    private async waitForPage(page: Page, delay?: number, waitFor?: string): Promise<void> {
        if (waitFor) {
            await page.waitForSelector(waitFor, { timeout: 30000 });
        }
        if (delay && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    /**
     * Scrape a webpage
     */
    async scrape(params: ScrapeParams | string): Promise<ScrapeResponse> {
        // Handle both old (string) and new (params) API
        const opts: ScrapeParams = typeof params === 'string'
            ? { url: params }
            : params;

        const { page, cleanup } = await this.getPage(opts.sessionId);

        try {
            await page.goto(opts.url, { waitUntil: 'networkidle2' });
            await this.waitForPage(page, opts.delay, opts.waitFor);

            const title = await page.title();
            const html = await page.content();

            let content = html;
            let markdown: string | undefined;

            // Format conversion
            if (opts.format === 'text') {
                content = await page.evaluate(() => document.body.innerText);
            } else if (opts.format === 'markdown') {
                // Basic HTML to markdown conversion
                content = await page.evaluate(() => document.body.innerText);
                markdown = content; // Placeholder - use turndown for proper conversion
            } else if (opts.format === 'readability') {
                // Readability extraction
                content = await page.evaluate(() => {
                    // Simple extraction of main content
                    const article = document.querySelector('article') ||
                        document.querySelector('main') ||
                        document.querySelector('.content') ||
                        document.body;
                    return article?.innerText || '';
                });
            }

            // Extract metadata
            const metadata = await page.evaluate(() => {
                const metas: Record<string, string> = {};
                document.querySelectorAll('meta').forEach(meta => {
                    const name = meta.getAttribute('name') || meta.getAttribute('property');
                    const content = meta.getAttribute('content');
                    if (name && content) {
                        metas[name] = content;
                    }
                });
                return metas;
            });

            return {
                title,
                content,
                url: opts.url,
                html: opts.format !== 'html' ? undefined : html,
                markdown,
                metadata
            };
        } finally {
            await cleanup();
        }
    }

    /**
     * Take a screenshot
     */
    async screenshot(params: ScreenshotParams | string, fullPage?: boolean): Promise<ScreenshotResponse | Buffer> {
        // Handle both old (string) and new (params) API
        const opts: ScreenshotParams = typeof params === 'string'
            ? { url: params, fullPage: fullPage ?? true }
            : params;

        const { page, cleanup } = await this.getPage(opts.sessionId);

        try {
            await page.goto(opts.url, { waitUntil: 'networkidle2' });

            if (opts.delay && opts.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, opts.delay));
            }

            const viewport = page.viewport();
            const data = await page.screenshot({
                fullPage: opts.fullPage ?? true,
                encoding: 'binary',
                type: opts.format || 'png',
                quality: opts.format === 'jpeg' ? opts.quality : undefined
            }) as Buffer;

            // Return old format for backwards compatibility if called with string
            if (typeof params === 'string') {
                return data;
            }

            return {
                data,
                format: opts.format || 'png',
                width: viewport?.width || 1920,
                height: viewport?.height || 1080
            };
        } finally {
            await cleanup();
        }
    }

    /**
     * Generate PDF
     */
    async pdf(params: PdfParams | string): Promise<PdfResponse | Buffer> {
        // Handle both old (string) and new (params) API
        const opts: PdfParams = typeof params === 'string'
            ? { url: params }
            : params;

        const { page, cleanup } = await this.getPage(opts.sessionId);

        try {
            await page.goto(opts.url, { waitUntil: 'networkidle2' });

            const pdfBuffer = await page.pdf({
                format: opts.format || 'A4',
                landscape: opts.landscape,
                printBackground: opts.printBackground ?? true,
                margin: opts.margin
            });

            const data = Buffer.from(pdfBuffer);

            // Return old format for backwards compatibility if called with string
            if (typeof params === 'string') {
                return data;
            }

            return {
                data,
                pageCount: 1 // PDF page count would require parsing the PDF
            };
        } finally {
            await cleanup();
        }
    }
}
