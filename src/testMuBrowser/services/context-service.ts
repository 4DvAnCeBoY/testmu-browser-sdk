
import { Page, CookieParam } from 'puppeteer-core';
import { SessionContext, Cookie } from '../types.js';

/**
 * ContextService - Session Context Management
 * 
 * Handles extraction and injection of browser context including:
 * - Cookies
 * - LocalStorage
 * - SessionStorage
 * - IndexedDB (placeholder - requires browser-side injection for full support)
 */
export class ContextService {

    /**
     * Extract the full session context from a page
     * This includes cookies, localStorage, and sessionStorage
     */
    async getContext(page: Page): Promise<SessionContext> {
        try {
            // Get cookies
            const cookies = await page.cookies() as Cookie[];

            // Get storage data (localStorage and sessionStorage)
            const storage = await page.evaluate(() => {
                const getStorageData = (storage: Storage) => {
                    const data: Record<string, string> = {};
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key) {
                            data[key] = storage.getItem(key) || '';
                        }
                    }
                    return data;
                };

                return {
                    localStorage: getStorageData(localStorage),
                    sessionStorage: getStorageData(sessionStorage),
                    origin: window.location.origin
                };
            });

            // Organize by origin
            const origin = storage.origin || 'unknown';

            return {
                cookies,
                localStorage: { [origin]: storage.localStorage },
                sessionStorage: { [origin]: storage.sessionStorage },
                // Note: IndexedDB extraction requires more complex handling
                // This is a placeholder for future implementation
                indexedDB: {}
            };
        } catch (error) {
            console.error('Error extracting context:', error);
            return {
                cookies: [],
                localStorage: {},
                sessionStorage: {},
                indexedDB: {}
            };
        }
    }

    /**
     * Set/inject session context into a page
     * This restores cookies, localStorage, and sessionStorage
     */
    async setContext(page: Page, context: SessionContext): Promise<void> {
        try {
            // Set cookies
            if (context.cookies && context.cookies.length > 0) {
                // Convert to Puppeteer-compatible format
                const cookieParams: CookieParam[] = context.cookies.map(c => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain,
                    path: c.path,
                    expires: c.expires,
                    httpOnly: c.httpOnly,
                    secure: c.secure,
                    sameSite: c.sameSite
                }));
                await page.setCookie(...cookieParams);
            }

            // Set localStorage for each origin
            if (context.localStorage) {
                for (const [origin, data] of Object.entries(context.localStorage)) {
                    // Navigate to origin first if needed
                    const currentUrl = page.url();
                    if (!currentUrl.startsWith(origin) && origin !== 'unknown') {
                        // We can only set localStorage for the current origin
                        // Skip if we're not on this origin
                        continue;
                    }

                    await page.evaluate((storageData) => {
                        for (const [key, value] of Object.entries(storageData)) {
                            localStorage.setItem(key, value);
                        }
                    }, data);
                }
            }

            // Set sessionStorage for each origin
            if (context.sessionStorage) {
                for (const [origin, data] of Object.entries(context.sessionStorage)) {
                    const currentUrl = page.url();
                    if (!currentUrl.startsWith(origin) && origin !== 'unknown') {
                        continue;
                    }

                    await page.evaluate((storageData) => {
                        for (const [key, value] of Object.entries(storageData)) {
                            sessionStorage.setItem(key, value);
                        }
                    }, data);
                }
            }

            // Note: IndexedDB injection is complex and requires browser-side scripts
            // This would need to be implemented with CDP or browser extensions

        } catch (error) {
            console.error('Error setting context:', error);
            throw error;
        }
    }

    /**
     * Clear all context from a page
     */
    async clearContext(page: Page): Promise<void> {
        try {
            // Clear cookies for current page
            const client = await page.createCDPSession();
            await client.send('Network.clearBrowserCookies');

            // Clear storage
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

        } catch (error) {
            console.error('Error clearing context:', error);
        }
    }

    /**
     * Get cookies only
     */
    async getCookies(page: Page): Promise<Cookie[]> {
        return await page.cookies() as Cookie[];
    }

    /**
     * Set cookies only
     */
    async setCookies(page: Page, cookies: Cookie[]): Promise<void> {
        if (cookies.length > 0) {
            const cookieParams: CookieParam[] = cookies.map(c => ({
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path,
                expires: c.expires,
                httpOnly: c.httpOnly,
                secure: c.secure,
                sameSite: c.sameSite
            }));
            await page.setCookie(...cookieParams);
        }
    }

    /**
     * Get localStorage for current origin
     */
    async getLocalStorage(page: Page): Promise<Record<string, string>> {
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
    }

    /**
     * Set localStorage for current origin
     */
    async setLocalStorage(page: Page, data: Record<string, string>): Promise<void> {
        await page.evaluate((storageData) => {
            for (const [key, value] of Object.entries(storageData)) {
                localStorage.setItem(key, value);
            }
        }, data);
    }
}
