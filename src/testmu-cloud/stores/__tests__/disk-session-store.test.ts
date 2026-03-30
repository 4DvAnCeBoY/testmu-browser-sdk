import { DiskSessionStore } from '../disk-session-store';
import { Session } from '../../types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

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

describe('DiskSessionStore', () => {
    let store: DiskSessionStore;
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = path.join(os.tmpdir(), `browser-cloud-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await fs.ensureDir(tmpDir);
        store = new DiskSessionStore(tmpDir);
    });

    afterEach(async () => {
        await fs.remove(tmpDir);
    });

    it('saves session to disk and retrieves it', async () => {
        const session = makeSession('s1');
        await store.save(session);
        const retrieved = await store.get('s1');
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe('s1');
        expect(retrieved!.websocketUrl).toBe('wss://test/s1');
    });

    it('persists session.json file', async () => {
        await store.save(makeSession('s1'));
        const filePath = path.join(tmpDir, 's1', 'session.json');
        expect(await fs.pathExists(filePath)).toBe(true);
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

    it('deletes session directory', async () => {
        await store.save(makeSession('s1'));
        await store.delete('s1');
        expect(await store.get('s1')).toBeNull();
        expect(await fs.pathExists(path.join(tmpDir, 's1'))).toBe(false);
    });

    it('deleteAll clears all sessions', async () => {
        await store.save(makeSession('s1'));
        await store.save(makeSession('s2'));
        await store.deleteAll();
        expect(await store.list()).toHaveLength(0);
    });

    it('includes adapter in persisted data', async () => {
        const session = makeSession('s1');
        (session.config as any).adapter = 'playwright';
        await store.save(session);
        const raw = await fs.readJson(path.join(tmpDir, 's1', 'session.json'));
        expect(raw.config.adapter).toBe('playwright');
    });
});
