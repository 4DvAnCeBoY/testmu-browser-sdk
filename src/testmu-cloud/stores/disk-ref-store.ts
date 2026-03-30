import { RefStore, RefMapping } from './ref-store';
import fs from 'fs-extra';
import path from 'path';

export class DiskRefStore implements RefStore {
    constructor(private baseDir: string) {}

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void> {
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
        await fs.rename(tmpPath, path.join(dir, 'refs.json'));
    }

    async load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        const filePath = path.join(this.baseDir, sessionId, 'refs.json');
        if (!await fs.pathExists(filePath)) return null;
        try {
            const raw = await fs.readJson(filePath);
            return {
                refs: new Map(Object.entries(raw.refs)) as Map<string, RefMapping>,
                url: raw.url,
            };
        } catch {
            return null;
        }
    }

    async get(sessionId: string, ref: string): Promise<RefMapping | null> {
        const data = await this.load(sessionId);
        if (!data) return null;
        return data.refs.get(ref) || null;
    }

    async clear(sessionId: string): Promise<void> {
        const refsPath = path.join(this.baseDir, sessionId, 'refs.json');
        await fs.remove(refsPath);
    }
}
