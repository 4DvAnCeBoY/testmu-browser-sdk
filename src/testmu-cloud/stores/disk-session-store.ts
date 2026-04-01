import { Session } from '../types';
import { SessionStore } from './session-store';
import fs from 'fs-extra';
import path from 'path';

/** Sanitize ID to prevent path traversal — allow only alphanumeric, hyphens, underscores, dots */
function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export class DiskSessionStore implements SessionStore {
    constructor(private baseDir: string) {}

    async save(session: Session): Promise<void> {
        const dir = path.join(this.baseDir, sanitizeId(session.id));
        await fs.ensureDir(dir);

        // Deep clone to avoid mutating the original session object
        const sanitized = JSON.parse(JSON.stringify(session)) as Session;

        // Strip credentials from websocketUrl
        if (sanitized.websocketUrl) {
            try {
                const parsed = new URL(sanitized.websocketUrl);
                parsed.username = '';
                parsed.password = '';
                sanitized.websocketUrl = parsed.toString();
            } catch {
                // If URL parsing fails, leave as-is
            }
        }

        // Strip credentials from LT:Options in config
        if (sanitized.config?.lambdatestOptions?.['LT:Options']) {
            delete sanitized.config.lambdatestOptions['LT:Options'].username;
            delete sanitized.config.lambdatestOptions['LT:Options'].accessKey;
        }

        const data = JSON.stringify(sanitized, null, 2);
        // Atomic write: write to temp, then rename
        const tmpPath = path.join(dir, `session.${process.pid}.tmp`);
        await fs.writeFile(tmpPath, data, { mode: 0o600 });
        await fs.move(tmpPath, path.join(dir, 'session.json'), { overwrite: true });
    }

    async get(id: string): Promise<Session | null> {
        const filePath = path.join(this.baseDir, sanitizeId(id), 'session.json');
        if (!await fs.pathExists(filePath)) return null;
        try {
            return await fs.readJson(filePath);
        } catch {
            return null;
        }
    }

    async list(): Promise<Session[]> {
        let dirs: string[];
        try {
            dirs = await fs.readdir(this.baseDir);
        } catch {
            return [];
        }
        const sessions: Session[] = [];
        for (const dir of dirs) {
            const session = await this.get(dir);
            if (session && session.status === 'live') sessions.push(session);
        }
        return sessions;
    }

    async delete(id: string): Promise<void> {
        const dir = path.join(this.baseDir, sanitizeId(id));
        await fs.remove(dir);
    }

    async deleteAll(): Promise<void> {
        let dirs: string[];
        try {
            dirs = await fs.readdir(this.baseDir);
        } catch {
            return;
        }
        for (const dir of dirs) {
            await this.delete(dir);
        }
    }
}
