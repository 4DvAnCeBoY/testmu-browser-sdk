
import { SessionContext, Cookie } from '../types.js';

/**
 * ContextService - Browser State Management (Framework Agnostic)
 *
 * Works with BOTH Puppeteer and Playwright pages.
 * Uses page.evaluate() for storage (works in both).
 * Auto-detects Puppeteer vs Playwright for cookies.
 *
 * Usage:
 * ```typescript
 * // Works with Puppeteer
 * const ctx = await contextService.getContext(puppeteerPage);
 *
 * // Works with Playwright
 * const ctx = await contextService.getContext(playwrightPage);
 * ```
 */
export class ContextService {

    /**
     * Detect if page is Puppeteer or Playwright
     */
    private detectFramework(page: any): 'puppeteer' | 'playwright' {
        // Playwright pages have page.context() method
        if (typeof page.context === 'function') {
            return 'playwright';
        }
        return 'puppeteer';
    }

    // ================== Get Operations ==================

    /**
     * Extract full browser state from a page
     * Works with both Puppeteer and Playwright
     */
    async getContext(page: any): Promise<SessionContext> {
        try {
            const cookies = await this.getCookies(page);
            const localStorage = await this.getLocalStorage(page);
            const sessionStorage = await this.getSessionStorage(page);

            return {
                cookies,
                localStorage: { 'current': localStorage },
                sessionStorage: { 'current': sessionStorage },
                indexedDB: {}
            };
        } catch (error) {
            console.error('[ContextService] Error extracting context:', error);
            return {
                cookies: [],
                localStorage: {},
                sessionStorage: {},
                indexedDB: {}
            };
        }
    }

    /**
     * Get cookies from page
     * Auto-detects Puppeteer vs Playwright
     */
    async getCookies(page: any): Promise<Cookie[]> {
        try {
            const framework = this.detectFramework(page);

            if (framework === 'playwright') {
                // Playwright: cookies are on the browser context
                const context = page.context();
                const cookies = await context.cookies();
                return cookies.map((c: any) => this.normalizeCookie(c));
            } else {
                // Puppeteer: cookies are on the page
                const cookies = await page.cookies();
                return cookies.map((c: any) => this.normalizeCookie(c));
            }
        } catch (error) {
            console.error('[ContextService] Error getting cookies:', error);
            return [];
        }
    }

    /**
     * Get localStorage for current page origin
     * Works with both Puppeteer and Playwright (page.evaluate is the same)
     */
    async getLocalStorage(page: any): Promise<Record<string, string>> {
        try {
            return await page.evaluate(() => {
                const data: Record<string, string> = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                        data[key] = localStorage.getItem(key) || '';
                    }
                }
                return data;
            });
        } catch (error) {
            // May fail if page is on about:blank or chrome://
            return {};
        }
    }

    /**
     * Get sessionStorage for current page origin
     */
    async getSessionStorage(page: any): Promise<Record<string, string>> {
        try {
            return await page.evaluate(() => {
                const data: Record<string, string> = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key) {
                        data[key] = sessionStorage.getItem(key) || '';
                    }
                }
                return data;
            });
        } catch (error) {
            return {};
        }
    }

    // ================== Set Operations ==================

    /**
     * Inject full browser state into a page
     * Page should already be navigated to the target origin
     */
    async setContext(page: any, context: SessionContext): Promise<void> {
        try {
            // Set cookies first (doesn't require specific origin)
            if (context.cookies && context.cookies.length > 0) {
                await this.setCookies(page, context.cookies);
            }

            // Set localStorage (requires page to be on the correct origin)
            if (context.localStorage) {
                // Flatten: get the first (and usually only) origin's data
                const storageData = this.flattenStorage(context.localStorage);
                if (Object.keys(storageData).length > 0) {
                    await this.setLocalStorage(page, storageData);
                }
            }

            // Set sessionStorage
            if (context.sessionStorage) {
                const storageData = this.flattenStorage(context.sessionStorage);
                if (Object.keys(storageData).length > 0) {
                    await this.setSessionStorage(page, storageData);
                }
            }
        } catch (error) {
            console.error('[ContextService] Error setting context:', error);
            throw error;
        }
    }

    /**
     * Set cookies on page
     * Auto-detects Puppeteer vs Playwright
     */
    async setCookies(page: any, cookies: Cookie[]): Promise<void> {
        if (!cookies || cookies.length === 0) return;

        try {
            const framework = this.detectFramework(page);

            if (framework === 'playwright') {
                // Playwright: cookies are set on the browser context
                const context = page.context();
                const playwrightCookies = cookies.map(c => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain || '',
                    path: c.path || '/',
                    expires: c.expires || -1,
                    httpOnly: c.httpOnly || false,
                    secure: c.secure || false,
                    sameSite: (c.sameSite || 'Lax') as 'Strict' | 'Lax' | 'None'
                }));
                await context.addCookies(playwrightCookies);
            } else {
                // Puppeteer: cookies are set on the page
                const puppeteerCookies = cookies.map(c => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain,
                    path: c.path || '/',
                    expires: c.expires,
                    httpOnly: c.httpOnly,
                    secure: c.secure,
                    sameSite: c.sameSite
                }));
                await page.setCookie(...puppeteerCookies);
            }
        } catch (error) {
            console.error('[ContextService] Error setting cookies:', error);
            throw error;
        }
    }

    /**
     * Set localStorage for current page origin
     * Page must be navigated to the correct origin first
     */
    async setLocalStorage(page: any, data: Record<string, string>): Promise<void> {
        if (!data || Object.keys(data).length === 0) return;

        await page.evaluate((storageData: Record<string, string>) => {
            for (const [key, value] of Object.entries(storageData)) {
                localStorage.setItem(key, value);
            }
        }, data);
    }

    /**
     * Set sessionStorage for current page origin
     */
    async setSessionStorage(page: any, data: Record<string, string>): Promise<void> {
        if (!data || Object.keys(data).length === 0) return;

        await page.evaluate((storageData: Record<string, string>) => {
            for (const [key, value] of Object.entries(storageData)) {
                sessionStorage.setItem(key, value);
            }
        }, data);
    }

    // ================== Clear Operations ==================

    /**
     * Clear all browser state from a page
     */
    async clearContext(page: any): Promise<void> {
        try {
            await this.clearCookies(page);
            await this.clearStorage(page);
        } catch (error) {
            console.error('[ContextService] Error clearing context:', error);
        }
    }

    /**
     * Clear all cookies
     */
    async clearCookies(page: any): Promise<void> {
        try {
            const framework = this.detectFramework(page);

            if (framework === 'playwright') {
                const context = page.context();
                await context.clearCookies();
            } else {
                // Puppeteer: use CDP to clear all cookies
                const client = await page.createCDPSession();
                await client.send('Network.clearBrowserCookies');
            }
        } catch (error) {
            console.error('[ContextService] Error clearing cookies:', error);
        }
    }

    /**
     * Clear localStorage and sessionStorage
     */
    async clearStorage(page: any): Promise<void> {
        try {
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
        } catch (error) {
            // May fail on about:blank
        }
    }

    // ================== Helpers ==================

    /**
     * Normalize cookie from any framework to our Cookie type
     */
    private normalizeCookie(cookie: any): Cookie {
        return {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || '',
            path: cookie.path || '/',
            expires: cookie.expires ?? -1,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax'
        };
    }

    /**
     * Flatten storage object: { origin: data } → data
     * Takes the first origin's data (since we only operate on current origin)
     */
    private flattenStorage(storage: Record<string, Record<string, string>>): Record<string, string> {
        const values = Object.values(storage);
        if (values.length === 0) return {};
        return values[0] || {};
    }
}
