import { detectFramework } from '../utils/framework-detect';

export interface NetworkRequest {
    url: string;
    method: string;
    status?: number;
    resourceType?: string;
    timestamp: number;
}

export class NetworkService {
    private requestLogs = new Map<string, NetworkRequest[]>();
    private activeRoutes = new Map<string, Set<string>>();
    private mockResponses = new Map<string, Map<string, { status?: number, body?: string, contentType?: string }>>();
    private interceptedPages = new WeakSet<object>();
    private cdpSessions = new Map<string, any[]>();

    /**
     * Block requests matching a URL pattern
     */
    async block(page: any, sessionId: string, pattern: string): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            await page.route(pattern, (route: any) => route.abort());
        } else {
            const client = await page.createCDPSession();
            if (!this.cdpSessions.has(sessionId)) {
                this.cdpSessions.set(sessionId, []);
            }
            this.cdpSessions.get(sessionId)!.push(client);
            const patterns = this.getActiveRoutes(sessionId);
            patterns.add(pattern);
            // Note: Network.setBlockedURLs is deprecated in newer Chrome versions,
            // but kept for backwards compatibility with older Puppeteer/Chrome combos.
            // The Playwright path uses page.route() which is the modern equivalent.
            await client.send('Network.setBlockedURLs', { urls: Array.from(patterns) });
        }
        this.getActiveRoutes(sessionId).add(`block:${pattern}`);
    }

    /**
     * Mock a URL with a custom response
     */
    async mock(page: any, sessionId: string, url: string, response: { status?: number, body?: string, contentType?: string }): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            await page.route(url, (route: any) => route.fulfill({
                status: response.status || 200,
                contentType: response.contentType || 'application/json',
                body: response.body || '',
            }));
        } else {
            // Maintain a URL-to-response map and a single interception handler
            if (!this.interceptedPages.has(page)) {
                await page.setRequestInterception(true);
                page.on('request', (req: any) => {
                    const sessionMocks = this.getMockResponses(sessionId);
                    const matchedUrl = Array.from(sessionMocks.keys()).find(u => req.url().includes(u));
                    if (matchedUrl) {
                        const r = sessionMocks.get(matchedUrl)!;
                        req.respond({
                            status: r.status || 200,
                            contentType: r.contentType || 'application/json',
                            body: r.body || '',
                        });
                    } else {
                        req.continue();
                    }
                });
                this.interceptedPages.add(page);
            }
            this.getMockResponses(sessionId).set(url, response);
        }
        this.getActiveRoutes(sessionId).add(`mock:${url}`);
    }

    /**
     * Set extra HTTP headers for all requests
     */
    async setHeaders(page: any, headers: Record<string, string>): Promise<void> {
        await page.setExtraHTTPHeaders(headers);
    }

    /**
     * Start logging network requests
     */
    startLogging(page: any, sessionId: string): void {
        const logs: NetworkRequest[] = [];
        this.requestLogs.set(sessionId, logs);

        const responseListener = (response: any) => {
            logs.push({
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
                resourceType: response.request().resourceType(),
                timestamp: Date.now(),
            });
        };
        page.on('response', responseListener);

        // Clean up listener if page or browser closes to prevent leaks
        const cleanup = () => {
            try { page.removeListener('response', responseListener); } catch { /* already removed */ }
        };
        page.once('close', cleanup);
        if (typeof page.browser === 'function') {
            try { page.browser().once('disconnected', cleanup); } catch { /* ignore */ }
        }
    }

    /**
     * Get logged network requests, optionally filtered
     */
    getLogs(sessionId: string, filter?: { method?: string, urlPattern?: string }): NetworkRequest[] {
        const logs = this.requestLogs.get(sessionId) || [];
        if (!filter) return logs;

        return logs.filter(req => {
            if (filter.method && req.method !== filter.method.toUpperCase()) return false;
            if (filter.urlPattern && !req.url.includes(filter.urlPattern)) return false;
            return true;
        });
    }

    /**
     * Clear network logs for a session
     */
    clearLogs(sessionId: string): void {
        this.requestLogs.delete(sessionId);
    }

    /**
     * Clear all cached data for a session (logs, routes, mocks) to prevent memory leaks.
     * Call this when a session is released.
     */
    clearSession(sessionId: string): void {
        this.requestLogs.delete(sessionId);
        this.activeRoutes.delete(sessionId);
        this.mockResponses.delete(sessionId);
        // Detach any CDP sessions created for this session
        const clients = this.cdpSessions.get(sessionId);
        if (clients) {
            for (const client of clients) {
                try { client.detach(); } catch { /* already detached */ }
            }
            this.cdpSessions.delete(sessionId);
        }
    }

    private getActiveRoutes(sessionId: string): Set<string> {
        if (!this.activeRoutes.has(sessionId)) {
            this.activeRoutes.set(sessionId, new Set());
        }
        return this.activeRoutes.get(sessionId)!;
    }

    private getMockResponses(sessionId: string): Map<string, { status?: number, body?: string, contentType?: string }> {
        if (!this.mockResponses.has(sessionId)) {
            this.mockResponses.set(sessionId, new Map());
        }
        return this.mockResponses.get(sessionId)!;
    }
}
