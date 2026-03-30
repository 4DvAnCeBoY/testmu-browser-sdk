import puppeteer from 'puppeteer-core';
import { DiskSessionStore } from '../testmu-cloud/stores/disk-session-store';
import { DiskRefStore } from '../testmu-cloud/stores/disk-ref-store';
import { PageService } from '../testmu-cloud/services/page-service';
import { SnapshotService } from '../testmu-cloud/services/snapshot-service';
import path from 'path';
import os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.testmuai', 'sessions');

export function getSessionStore(): DiskSessionStore {
    return new DiskSessionStore(SESSIONS_DIR);
}

export function getRefStore(): DiskRefStore {
    return new DiskRefStore(SESSIONS_DIR);
}

export function createPageService(): { pageService: PageService, snapshotService: SnapshotService } {
    const refStore = getRefStore();
    const snapshotService = new SnapshotService(refStore);
    const pageService = new PageService(snapshotService, refStore);
    return { pageService, snapshotService };
}

export async function getSessionPage(sessionId: string): Promise<{
    page: any,
    framework: 'puppeteer' | 'playwright',
    cleanup: () => Promise<void>,
}> {
    const store = getSessionStore();
    const session = await store.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found. Run 'session create' first.`);
    if (session.status !== 'live') throw new Error(`Session "${sessionId}" is ${session.status}.`);

    const adapter = (session as any).config?.adapter || 'puppeteer';

    if (adapter === 'playwright') {
        const { chromium } = await import('playwright-core');
        const browser = await chromium.connectOverCDP(session.websocketUrl);
        const contexts = browser.contexts();
        const context = contexts[0] || await browser.newContext();
        const pages = context.pages();
        const page = pages[pages.length - 1] || await context.newPage();
        return {
            page,
            framework: 'playwright',
            cleanup: async () => { await browser.close(); },
        };
    } else {
        const browser = await puppeteer.connect({ browserWSEndpoint: session.websocketUrl });
        const pages = await browser.pages();
        const page = pages[pages.length - 1] || await browser.newPage();
        return {
            page,
            framework: 'puppeteer',
            cleanup: async () => { browser.disconnect(); },
        };
    }
}

export async function resolveSessionId(explicitId?: string): Promise<string> {
    if (explicitId) return explicitId;
    const store = getSessionStore();
    const sessions = await store.list();
    if (sessions.length === 0) throw new Error('No active sessions. Run "session create" first.');
    if (sessions.length > 1) throw new Error(`Multiple active sessions (${sessions.length}). Specify --session <id>.`);
    return sessions[0].id;
}
