/**
 * Detect whether a page object is from Puppeteer or Playwright.
 * Playwright pages have both page.locator() and page.context() methods;
 * checking both avoids false positives from Puppeteer pages that may
 * coincidentally have a context property.
 */
export function detectFramework(page: any): 'puppeteer' | 'playwright' {
    if (typeof page.locator === 'function' && typeof page.context === 'function') return 'playwright';
    return 'puppeteer';
}
