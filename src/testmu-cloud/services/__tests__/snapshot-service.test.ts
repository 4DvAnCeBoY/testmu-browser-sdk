import { SnapshotService } from '../snapshot-service';
import { InMemoryRefStore } from '../../stores/memory-ref-store';

function createMockPage(accessibilityTree: any, url: string = 'https://example.com', title: string = 'Test Page') {
    return {
        url: () => url,
        title: async () => title,
        accessibility: {
            snapshot: async (_opts?: any) => accessibilityTree,
        },
        evaluate: async (_fn: Function, ..._args: any[]) => {
            return { xpath: '/html/body/button', css: 'button' };
        },
        mainFrame: () => ({ url: () => url }),
        frames: () => [],
    };
}

describe('SnapshotService', () => {
    let service: SnapshotService;
    let refStore: InMemoryRefStore;

    beforeEach(() => {
        refStore = new InMemoryRefStore();
        service = new SnapshotService(refStore);
    });

    it('captures snapshot and assigns refs to interactive elements', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Test Page',
            children: [
                { role: 'heading', name: 'Title', children: [] },
                { role: 'textbox', name: 'Email', value: '', children: [] },
                { role: 'button', name: 'Submit', children: [] },
            ],
        };
        const page = createMockPage(tree);
        const result = await service.capture(page, 'session1');

        expect(result.url).toBe('https://example.com');
        expect(result.title).toBe('Test Page');
        expect(result.refCount).toBeGreaterThan(0);
        expect(result.tree.children).toBeDefined();

        // Verify refs were stored
        const stored = await refStore.load('session1');
        expect(stored).not.toBeNull();
        expect(stored!.refs.size).toBe(result.refCount);
    });

    it('only assigns refs to eligible roles', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Test',
            children: [
                { role: 'button', name: 'Click Me', children: [] },
                { role: 'generic', name: '', children: [] },
                { role: 'paragraph', name: '', children: [] },
                { role: 'link', name: 'Home', children: [] },
            ],
        };
        const page = createMockPage(tree);
        const result = await service.capture(page, 's1');

        // Only button and link are ref-eligible
        expect(result.refCount).toBe(2);
    });

    it('respects maxElements option', async () => {
        const children = Array.from({ length: 20 }, (_, i) => ({
            role: 'button', name: `Button ${i}`, children: [],
        }));
        const tree = { role: 'WebArea', name: 'Test', children };
        const page = createMockPage(tree);
        const result = await service.capture(page, 's1', { maxElements: 5 });

        expect(result.refCount).toBe(5);
        expect(result.truncated).toBe(true);
    });

    it('generates compact text format', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Login',
            children: [
                { role: 'textbox', name: 'Email', value: '', children: [] },
                { role: 'button', name: 'Submit', children: [] },
            ],
        };
        const page = createMockPage(tree, 'https://example.com/login', 'Login');
        const result = await service.capture(page, 's1', { compact: true });

        expect(result.compactText).toBeDefined();
        expect(result.compactText).toContain('[Login]');
        expect(result.compactText).toContain('textbox "Email"');
        expect(result.compactText).toContain('button "Submit"');
    });

    it('handles null accessibility tree gracefully', async () => {
        const page = createMockPage(null);
        const result = await service.capture(page, 's1');

        expect(result.tree.role).toBe('WebArea');
        expect(result.refCount).toBe(0);
    });

    it('includes element state in snapshot', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Test',
            children: [
                { role: 'checkbox', name: 'Agree', checked: true, children: [] },
                { role: 'button', name: 'Submit', disabled: true, children: [] },
            ],
        };
        const page = createMockPage(tree);
        const result = await service.capture(page, 's1');

        const checkbox = result.tree.children?.find(n => n.role === 'checkbox');
        const button = result.tree.children?.find(n => n.role === 'button');
        expect(checkbox?.state?.checked).toBe(true);
        expect(button?.state?.disabled).toBe(true);
    });

    it('assigns sequential refs in tree order', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Test',
            children: [
                { role: 'link', name: 'First', children: [] },
                { role: 'button', name: 'Second', children: [] },
                { role: 'textbox', name: 'Third', children: [] },
            ],
        };
        const page = createMockPage(tree);
        const result = await service.capture(page, 's1');

        const refs = result.tree.children!.map(n => n.ref);
        expect(refs).toEqual(['@e1', '@e2', '@e3']);
    });

    describe('diff', () => {
        it('detects added elements', async () => {
            const tree1 = { role: 'WebArea', name: 'Test', children: [
                { role: 'button', name: 'Submit', children: [] },
            ]};
            const tree2 = { role: 'WebArea', name: 'Test', children: [
                { role: 'button', name: 'Submit', children: [] },
                { role: 'link', name: 'Help', children: [] },
            ]};
            const page1 = createMockPage(tree1);
            const page2 = createMockPage(tree2);
            const snap1 = await service.capture(page1, 's1');
            const snap2 = await service.capture(page2, 's1');
            const diff = service.diff(snap1, snap2);

            expect(diff.added).toHaveLength(1);
            expect(diff.added[0].name).toBe('Help');
            expect(diff.removed).toHaveLength(0);
        });

        it('detects removed elements', async () => {
            const tree1 = { role: 'WebArea', name: 'Test', children: [
                { role: 'button', name: 'Submit', children: [] },
                { role: 'link', name: 'Help', children: [] },
            ]};
            const tree2 = { role: 'WebArea', name: 'Test', children: [
                { role: 'button', name: 'Submit', children: [] },
            ]};
            const page1 = createMockPage(tree1);
            const page2 = createMockPage(tree2);
            const snap1 = await service.capture(page1, 's1');
            const snap2 = await service.capture(page2, 's1');
            const diff = service.diff(snap1, snap2);

            expect(diff.removed).toHaveLength(1);
            expect(diff.removed[0].name).toBe('Help');
        });

        it('detects changed values', async () => {
            const tree1 = { role: 'WebArea', name: 'Test', children: [
                { role: 'textbox', name: 'Email', value: '', children: [] },
            ]};
            const tree2 = { role: 'WebArea', name: 'Test', children: [
                { role: 'textbox', name: 'Email', value: 'user@test.com', children: [] },
            ]};
            const page1 = createMockPage(tree1);
            const page2 = createMockPage(tree2);
            const snap1 = await service.capture(page1, 's1');
            const snap2 = await service.capture(page2, 's1');
            const diff = service.diff(snap1, snap2);

            expect(diff.changed).toHaveLength(1);
            expect(diff.changed[0].changes[0].field).toBe('value');
            expect(diff.changed[0].changes[0].to).toBe('user@test.com');
        });

        it('detects URL change', async () => {
            const tree = { role: 'WebArea', name: 'Test', children: [] };
            const page1 = createMockPage(tree, 'https://example.com/login');
            const page2 = createMockPage(tree, 'https://example.com/dashboard');
            const snap1 = await service.capture(page1, 's1');
            const snap2 = await service.capture(page2, 's1');
            const diff = service.diff(snap1, snap2);

            expect(diff.urlChanged).toBe(true);
            expect(diff.previousUrl).toBe('https://example.com/login');
            expect(diff.currentUrl).toBe('https://example.com/dashboard');
        });

        it('reports no changes when identical', async () => {
            const tree = { role: 'WebArea', name: 'Test', children: [
                { role: 'button', name: 'Submit', children: [] },
            ]};
            const page = createMockPage(tree);
            const snap1 = await service.capture(page, 's1');
            const snap2 = await service.capture(page, 's1');
            const diff = service.diff(snap1, snap2);

            expect(diff.added).toHaveLength(0);
            expect(diff.removed).toHaveLength(0);
            expect(diff.changed).toHaveLength(0);
            expect(diff.unchanged).toBe(1);
        });

        it('generates compact diff text', async () => {
            const tree1 = { role: 'WebArea', name: 'Test', children: [
                { role: 'button', name: 'Login', children: [] },
            ]};
            const tree2 = { role: 'WebArea', name: 'Dashboard', children: [
                { role: 'button', name: 'Logout', children: [] },
            ]};
            const page1 = createMockPage(tree1, 'https://example.com/login', 'Login');
            const page2 = createMockPage(tree2, 'https://example.com/dashboard', 'Dashboard');
            const snap1 = await service.capture(page1, 's1');
            const snap2 = await service.capture(page2, 's1');
            const diff = service.diff(snap1, snap2);
            const text = service.diffToCompactText(diff, 'Dashboard');

            expect(text).toContain('CHANGED: URL');
            expect(text).toContain('REMOVED:');
            expect(text).toContain('Login');
            expect(text).toContain('ADDED:');
            expect(text).toContain('Logout');
        });
    });

    it('stores previous snapshot for diffing', async () => {
        const tree = { role: 'WebArea', name: 'Test', children: [
            { role: 'button', name: 'Submit', children: [] },
        ]};
        const page = createMockPage(tree);
        await service.capture(page, 's1');
        const prev = service.getPrevious('s1');
        expect(prev).not.toBeNull();
        expect(prev!.refCount).toBe(1);
    });
});
