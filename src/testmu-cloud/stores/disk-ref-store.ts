import { RefStore, RefMapping } from './ref-store';
import fs from 'fs-extra';
import path from 'path';

interface CacheEntry {
    data: { refs: Map<string, RefMapping>, url: string };
    mtimeMs: number;
}

/** Sanitize clientId to prevent path traversal — allow only alphanumeric, hyphens, underscores */
function sanitizeClientId(clientId: string): string {
    return clientId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export class DiskRefStore implements RefStore {
    private cache = new Map<string, CacheEntry>();

    constructor(private baseDir: string) {}

    private refsFileName(clientId?: string): string {
        return clientId ? `refs.${sanitizeClientId(clientId)}.json` : 'refs.json';
    }

    private cacheKey(sessionId: string, clientId?: string): string {
        return clientId ? `${sessionId}:${clientId}` : sessionId;
    }

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string, clientId?: string): Promise<void> {
        const dir = path.join(this.baseDir, sessionId);
        await fs.ensureDir(dir);
        const data = JSON.stringify({
            version: 1,
            url,
            timestamp: Date.now(),
            refs: Object.fromEntries(refs),
        }, null, 2);
        const tmpPath = path.join(dir, `refs.${process.pid}.tmp`);
        await fs.writeFile(tmpPath, data, { mode: 0o600 });
        const filePath = path.join(dir, this.refsFileName(clientId));
        await fs.rename(tmpPath, filePath);

        // Update cache after write
        const stat = await fs.stat(filePath);
        this.cache.set(this.cacheKey(sessionId, clientId), {
            data: { refs, url },
            mtimeMs: stat.mtimeMs,
        });
    }

    async load(sessionId: string, clientId?: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        const filePath = path.join(this.baseDir, sessionId, this.refsFileName(clientId));
        if (!await fs.pathExists(filePath)) return null;

        try {
            const stat = await fs.stat(filePath);
            const key = this.cacheKey(sessionId, clientId);
            const cached = this.cache.get(key);
            if (cached && cached.mtimeMs === stat.mtimeMs) {
                return cached.data;
            }

            const raw = await fs.readJson(filePath);
            const data = {
                refs: new Map(Object.entries(raw.refs)) as Map<string, RefMapping>,
                url: raw.url,
            };
            this.cache.set(key, { data, mtimeMs: stat.mtimeMs });
            return data;
        } catch {
            return null;
        }
    }

    async get(sessionId: string, ref: string, clientId?: string): Promise<RefMapping | null> {
        const data = await this.load(sessionId, clientId);
        if (!data) return null;
        return data.refs.get(ref) || null;
    }

    async clear(sessionId: string, clientId?: string): Promise<void> {
        const refsPath = path.join(this.baseDir, sessionId, this.refsFileName(clientId));
        await fs.remove(refsPath);
        this.cache.delete(this.cacheKey(sessionId, clientId));
    }
}
