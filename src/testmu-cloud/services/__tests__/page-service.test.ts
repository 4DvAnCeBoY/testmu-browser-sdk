import { PageService } from '../page-service';
import { SnapshotService } from '../snapshot-service';
import { InMemoryRefStore } from '../../stores/memory-ref-store';
import { RefMapping } from '../../stores/ref-store';

function createMockPuppeteerPage() {
    const clickedSelectors: string[] = [];
    const filledData: { selector: string; value: string }[] = [];
    let currentUrl = 'https://example.com';
    const currentTitle = 'Test Page';

    const mockElement = (selector: string) => ({
        click: async (_opts?: any) => { clickedSelectors.push(selector); },
        type: async (text: string) => { filledData.push({ selector, value: text }); },
        fill: async (text: string) => { filledData.push({ selector, value: text }); },
        hover: async () => {},
        focus: async () => {},
        evaluate: async (_fn: Function, ..._args: any[]) => 'mock text',
        isVisible: async () => true,
        isEnabled: async () => true,
        isChecked: async () => false,
        boundingBox: async () => ({ x: 0, y: 0, width: 100, height: 30 }),
        textContent: async () => 'mock text',
        innerHTML: async () => '<span>mock</span>',
        inputValue: async () => 'mock value',
        getAttribute: async (_attr: string) => 'mock-attr',
    });

    return {
        url: () => currentUrl,
        title: async () => currentTitle,
        goto: async (url: string) => { currentUrl = url; },
        goBack: async () => {},
        goForward: async () => {},
        reload: async () => {},
        waitForSelector: async (selector: string, _opts?: any) => mockElement(selector),
        $$: async (_selector: string) => [1, 2, 3],
        evaluate: async (_fn: any, ..._args: any[]) => 'evaluated result',
        keyboard: { press: async (_key: string) => {} },
        mouse: { wheel: async (_opts: any) => {} },
        accessibility: {
            snapshot: async () => ({ role: 'WebArea', name: 'Test', children: [] }),
        },
        mainFrame: () => ({ url: () => currentUrl }),
        frames: () => [],
        _clickedSelectors: clickedSelectors,
        _filledData: filledData,
    };
}

describe('PageService', () => {
    let service: PageService;
    let refStore: InMemoryRefStore;
    let snapshotService: SnapshotService;
    let page: any;

    beforeEach(async () => {
        refStore = new InMemoryRefStore();
        snapshotService = new SnapshotService(refStore);
        service = new PageService(snapshotService, refStore);
        page = createMockPuppeteerPage();
        service.bind(page, 'test-session');
    });

    describe('bind', () => {
        it('binds page to session', () => {
            expect(() => service.bind(page, 'test-session')).not.toThrow();
        });

        it('throws when using unbound page', async () => {
            const unboundPage = createMockPuppeteerPage();
            await expect(service.getUrl(unboundPage)).rejects.toThrow('Page not bound');
        });
    });

    describe('navigation', () => {
        it('navigate returns url and title', async () => {
            const result = await service.navigate(page, 'https://example.com/new');
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('title');
        });
    });

    describe('selector resolution', () => {
        it('resolves CSS selectors directly', async () => {
            await service.click(page, '#submit-btn');
            expect(page._clickedSelectors).toContain('#submit-btn');
        });

        it('resolves @ref selectors from store', async () => {
            const refs = new Map<string, RefMapping>([
                ['@e1', { xpath: '/html/body/button', css: '#submit', role: 'button', name: 'Submit' }],
            ]);
            await refStore.save('test-session', refs, 'https://example.com');

            await service.click(page, '@e1');
            expect(page._clickedSelectors.length).toBeGreaterThan(0);
        });

        it('throws for unknown @ref', async () => {
            await expect(service.click(page, '@e99')).rejects.toThrow('Unknown ref');
        });
    });

    describe('queries', () => {
        it('getUrl returns current URL', async () => {
            const url = await service.getUrl(page);
            expect(url).toBe('https://example.com');
        });

        it('getTitle returns page title', async () => {
            const title = await service.getTitle(page);
            expect(title).toBe('Test Page');
        });
    });

    describe('snapshot delegation', () => {
        it('snapshot calls SnapshotService.capture', async () => {
            const result = await service.snapshot(page);
            expect(result).toHaveProperty('tree');
            expect(result).toHaveProperty('refCount');
        });

        it('snapshot with compact option', async () => {
            const result = await service.snapshot(page, { compact: true });
            expect(result).toHaveProperty('compactText');
        });
    });

    describe('find', () => {
        it('findByRole returns matching refs', async () => {
            const refs = new Map<string, RefMapping>([
                ['@e1', { xpath: '', css: '', role: 'button', name: 'Submit' }],
                ['@e2', { xpath: '', css: '', role: 'link', name: 'Home' }],
                ['@e3', { xpath: '', css: '', role: 'button', name: 'Cancel' }],
            ]);
            await refStore.save('test-session', refs, 'https://example.com');

            const results = await service.findByRole(page, 'button');
            expect(results).toHaveLength(2);
            expect(results[0].ref).toBe('@e1');
            expect(results[1].ref).toBe('@e3');
        });

        it('findByText returns matching refs', async () => {
            const refs = new Map<string, RefMapping>([
                ['@e1', { xpath: '', css: '', role: 'button', name: 'Submit Order' }],
                ['@e2', { xpath: '', css: '', role: 'link', name: 'Home' }],
            ]);
            await refStore.save('test-session', refs, 'https://example.com');

            const results = await service.findByText(page, 'Submit');
            expect(results).toHaveLength(1);
            expect(results[0].ref).toBe('@e1');
        });

        it('findByRole returns empty when no snapshot taken', async () => {
            const results = await service.findByRole(page, 'button');
            expect(results).toHaveLength(0);
        });
    });
});
