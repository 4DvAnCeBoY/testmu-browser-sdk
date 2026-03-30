import { InMemoryRefStore } from '../memory-ref-store';
import { DiskRefStore } from '../disk-ref-store';
import { RefStore, RefMapping } from '../ref-store';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const testRefs = new Map<string, RefMapping>([
    ['@e1', { xpath: '/html/body/button', css: 'button', role: 'button', name: 'Submit' }],
    ['@e2', { xpath: '/html/body/input', css: '#email', role: 'textbox', name: 'Email' }],
]);

function runStoreTests(name: string, createStore: () => Promise<{ store: RefStore, cleanup: () => Promise<void> }>) {
    describe(name, () => {
        let store: RefStore;
        let cleanup: () => Promise<void>;

        beforeEach(async () => {
            const result = await createStore();
            store = result.store;
            cleanup = result.cleanup;
        });

        afterEach(async () => {
            await cleanup();
        });

        it('saves and loads refs', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            const loaded = await store.load('s1');
            expect(loaded).not.toBeNull();
            expect(loaded!.url).toBe('https://example.com');
            expect(loaded!.refs.get('@e1')).toEqual({ xpath: '/html/body/button', css: 'button', role: 'button', name: 'Submit' });
            expect(loaded!.refs.size).toBe(2);
        });

        it('gets a single ref', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            const ref = await store.get('s1', '@e1');
            expect(ref).toEqual({ xpath: '/html/body/button', css: 'button', role: 'button', name: 'Submit' });
        });

        it('returns null for unknown ref', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            expect(await store.get('s1', '@e99')).toBeNull();
        });

        it('returns null for unknown session', async () => {
            expect(await store.load('nonexistent')).toBeNull();
        });

        it('clears refs for a session', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            await store.clear('s1');
            expect(await store.load('s1')).toBeNull();
        });
    });
}

runStoreTests('InMemoryRefStore', async () => ({
    store: new InMemoryRefStore(),
    cleanup: async () => {},
}));

runStoreTests('DiskRefStore', async () => {
    const tmpDir = path.join(os.tmpdir(), `ref-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    return {
        store: new DiskRefStore(tmpDir),
        cleanup: async () => { await fs.remove(tmpDir); },
    };
});
