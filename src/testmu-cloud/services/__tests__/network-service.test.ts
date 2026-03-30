import { NetworkService } from '../network-service';

function createMockPuppeteerPage() {
    const blockedUrls: string[] = [];
    const extraHeaders: Record<string, string>[] = [];
    const responseHandlers: ((...args: unknown[]) => void)[] = [];

    return {
        createCDPSession: async () => ({
            send: async (method: string, params: any) => {
                if (method === 'Network.setBlockedURLs') blockedUrls.push(...params.urls);
            },
        }),
        setRequestInterception: async (_val: boolean) => {},
        setExtraHTTPHeaders: async (headers: Record<string, string>) => { extraHeaders.push(headers); },
        on: (event: string, handler: (...args: unknown[]) => void) => {
            if (event === 'response') responseHandlers.push(handler);
            if (event === 'request') { /* mock request interception */ }
        },
        _blockedUrls: blockedUrls,
        _extraHeaders: extraHeaders,
        _responseHandlers: responseHandlers,
    };
}

describe('NetworkService', () => {
    let service: NetworkService;
    let page: any;

    beforeEach(() => {
        service = new NetworkService();
        page = createMockPuppeteerPage();
    });

    describe('block', () => {
        it('blocks URLs via CDP for Puppeteer', async () => {
            await service.block(page, 's1', '*.ads.com/*');
            expect(page._blockedUrls).toContain('*.ads.com/*');
        });
    });

    describe('setHeaders', () => {
        it('sets extra HTTP headers', async () => {
            await service.setHeaders(page, { 'Authorization': 'Bearer token123' });
            expect(page._extraHeaders).toHaveLength(1);
            expect(page._extraHeaders[0]).toEqual({ 'Authorization': 'Bearer token123' });
        });
    });

    describe('logging', () => {
        it('starts logging and returns logs', () => {
            service.startLogging(page, 's1');

            // Simulate a response event
            const mockResponse = {
                url: () => 'https://api.example.com/data',
                status: () => 200,
                request: () => ({
                    method: () => 'GET',
                    resourceType: () => 'fetch',
                }),
            };
            page._responseHandlers[0](mockResponse);

            const logs = service.getLogs('s1');
            expect(logs).toHaveLength(1);
            expect(logs[0].url).toBe('https://api.example.com/data');
            expect(logs[0].method).toBe('GET');
            expect(logs[0].status).toBe(200);
        });

        it('filters logs by method', () => {
            service.startLogging(page, 's1');

            const makeResponse = (url: string, method: string) => ({
                url: () => url,
                status: () => 200,
                request: () => ({ method: () => method, resourceType: () => 'fetch' }),
            });

            page._responseHandlers[0](makeResponse('https://api.com/get', 'GET'));
            page._responseHandlers[0](makeResponse('https://api.com/post', 'POST'));

            const getLogs = service.getLogs('s1', { method: 'POST' });
            expect(getLogs).toHaveLength(1);
            expect(getLogs[0].url).toContain('/post');
        });

        it('filters logs by URL pattern', () => {
            service.startLogging(page, 's1');

            const makeResponse = (url: string) => ({
                url: () => url,
                status: () => 200,
                request: () => ({ method: () => 'GET', resourceType: () => 'fetch' }),
            });

            page._responseHandlers[0](makeResponse('https://api.example.com/users'));
            page._responseHandlers[0](makeResponse('https://cdn.example.com/image.png'));

            const filtered = service.getLogs('s1', { urlPattern: 'api.example' });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].url).toContain('api.example');
        });

        it('clears logs', () => {
            service.startLogging(page, 's1');
            const mockResponse = {
                url: () => 'https://api.com/data', status: () => 200,
                request: () => ({ method: () => 'GET', resourceType: () => 'fetch' }),
            };
            page._responseHandlers[0](mockResponse);
            expect(service.getLogs('s1')).toHaveLength(1);

            service.clearLogs('s1');
            expect(service.getLogs('s1')).toHaveLength(0);
        });

        it('returns empty array for unknown session', () => {
            expect(service.getLogs('nonexistent')).toHaveLength(0);
        });
    });
});
