/**
 * Detect whether a page object is from Puppeteer or Playwright.
 * Playwright pages have a page.context() method; Puppeteer pages do not.
 */
export function detectFramework(page: any): 'puppeteer' | 'playwright' {
    if (typeof page.context === 'function') return 'playwright';
    return 'puppeteer';
}
