import { InMemorySessionStore } from '../memory-session-store';
import { Session } from '../../types';

function makeSession(id: string, status: 'live' | 'released' = 'live'): Session {
    return {
        id,
        websocketUrl: `wss://test/${id}`,
        debugUrl: 'http://localhost:9222',
        config: { adapter: 'puppeteer' },
        status,
        createdAt: new Date().toISOString(),
        timeout: 300000,
        dimensions: { width: 1920, height: 1080 },
    } as Session;
}

describe('InMemorySessionStore', () => {
    let store: InMemorySessionStore;

    beforeEach(() => {
        store = new InMemorySessionStore();
    });

    it('saves and retrieves a session', async () => {
        const session = makeSession('s1');
        await store.save(session);
        const retrieved = await store.get('s1');
        expect(retrieved).toEqual(session);
    });

    it('returns null for unknown session', async () => {
        expect(await store.get('nonexistent')).toBeNull();
    });

    it('lists only live sessions', async () => {
        await store.save(makeSession('s1', 'live'));
        await store.save(makeSession('s2', 'released'));
        const list = await store.list();
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe('s1');
    });

    it('deletes a session', async () => {
        await store.save(makeSession('s1'));
        await store.delete('s1');
        expect(await store.get('s1')).toBeNull();
    });

    it('deleteAll clears all sessions', async () => {
        await store.save(makeSession('s1'));
        await store.save(makeSession('s2'));
        await store.deleteAll();
        expect(await store.list()).toHaveLength(0);
    });
});
