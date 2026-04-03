import puppeteer from 'puppeteer-core';
import { DiskSessionStore } from '../testmu-cloud/stores/disk-session-store';
import { DiskRefStore } from '../testmu-cloud/stores/disk-ref-store';
import { PageService } from '../testmu-cloud/services/page-service';
import { SnapshotService } from '../testmu-cloud/services/snapshot-service';
import { ConfigManager } from './config';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

/** Sanitize clientId to prevent path traversal */
function sanitizeClientId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Sanitize ID to prevent path traversal — allow only alphanumeric, hyphens, underscores, dots */
function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

const SESSIONS_DIR = path.join(os.homedir(), '.testmuai', 'sessions');

// Stable client ID for CLI — scopes ref and snapshot files to avoid cross-agent interference
export const DEFAULT_CLIENT_ID = 'cli';

// Singleton instances to preserve state across CLI calls within one process
let sessionStoreInstance: DiskSessionStore | null = null;
let refStoreInstance: DiskRefStore | null = null;
let pageServiceInstance: { pageService: PageService, snapshotService: SnapshotService } | null = null;

export function getSessionStore(): DiskSessionStore {
    if (!sessionStoreInstance) {
        sessionStoreInstance = new DiskSessionStore(SESSIONS_DIR);
    }
    return sessionStoreInstance;
}

export function getRefStore(): DiskRefStore {
    if (!refStoreInstance) {
        refStoreInstance = new DiskRefStore(SESSIONS_DIR);
    }
    return refStoreInstance;
}

export function createPageService(): { pageService: PageService, snapshotService: SnapshotService } {
    if (!pageServiceInstance) {
        const refStore = getRefStore();
        const snapshotService = new SnapshotService(refStore);
        const pageService = new PageService(snapshotService, refStore);
        pageServiceInstance = { pageService, snapshotService };
    }
    return pageServiceInstance;
}

/**
 * Save the previous snapshot to disk so cross-process --diff works.
 * When clientId is provided, uses prev-snapshot.{clientId}.json for isolation.
 */
export async function savePreviousSnapshot(sessionId: string, snapshot: any, clientId?: string): Promise<void> {
    const dir = path.join(SESSIONS_DIR, sanitizeId(sessionId));
    await fs.ensureDir(dir);
    const tmpPath = path.join(dir, `prev-snapshot.${process.pid}.tmp`);
    await fs.writeFile(tmpPath, JSON.stringify(snapshot), { mode: 0o600 });
    const fileName = clientId ? `prev-snapshot.${sanitizeClientId(clientId)}.json` : 'prev-snapshot.json';
    await fs.move(tmpPath, path.join(dir, fileName), { overwrite: true });
}

/**
 * Load the previous snapshot from disk for cross-process --diff.
 * When clientId is provided, reads from prev-snapshot.{clientId}.json.
 */
export async function loadPreviousSnapshot(sessionId: string, clientId?: string): Promise<any | null> {
    const fileName = clientId ? `prev-snapshot.${sanitizeClientId(clientId)}.json` : 'prev-snapshot.json';
    const filePath = path.join(SESSIONS_DIR, sanitizeId(sessionId), fileName);
    if (!await fs.pathExists(filePath)) return null;
    try {
        return await fs.readJson(filePath);
    } catch {
        return null;
    }
}

function pageStateFileName(clientId?: string): string {
    return clientId ? `page-state.${sanitizeClientId(clientId)}.json` : 'page-state.json';
}

/**
 * Save the active page URL for this session so the next CLI process can find the right tab.
 * When clientId is provided, scoped to prevent cross-agent collisions.
 */
export async function savePageState(sessionId: string, url: string, clientId?: string): Promise<void> {
    const dir = path.join(SESSIONS_DIR, sanitizeId(sessionId));
    await fs.ensureDir(dir);
    const fileName = pageStateFileName(clientId);
    const tmpPath = path.join(dir, `${fileName}.${process.pid}.tmp`);
    await fs.writeFile(tmpPath, JSON.stringify({ url, timestamp: Date.now() }), { mode: 0o600 });
    await fs.move(tmpPath, path.join(dir, fileName), { overwrite: true });
}

/**
 * Load the last active page URL for cross-process reconnection.
 * When clientId is provided, reads from client-scoped file.
 */
async function loadPageState(sessionId: string, clientId?: string): Promise<string | null> {
    const filePath = path.join(SESSIONS_DIR, sanitizeId(sessionId), pageStateFileName(clientId));
    if (!await fs.pathExists(filePath)) return null;
    try {
        const data = await fs.readJson(filePath);
        return data.url || null;
    } catch {
        return null;
    }
}

function isRealUrl(url: string): boolean {
    return !!url && !url.startsWith('chrome://') && !url.startsWith('about:') && url !== '';
}

export interface GetSessionPageOptions {
    /** If true, skip auto-navigating to the last known URL on reconnect. Default: false */
    noAutoNavigate?: boolean;
    /** Client ID for session isolation — scopes page-state and refs per agent */
    clientId?: string;
}

export async function getSessionPage(sessionId: string, options?: GetSessionPageOptions): Promise<{
    page: any,
    framework: 'puppeteer' | 'playwright',
    cleanup: () => Promise<void>,
}> {
    const store = getSessionStore();
    const session = await store.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found. Run 'session create' first.`);
    if (session.status !== 'live') throw new Error(`Session "${sessionId}" is ${session.status}.`);

    const adapter = (session as any).config?.adapter || 'puppeteer';
    const clientId = options?.clientId;
    const lastUrl = options?.noAutoNavigate ? null : await loadPageState(sessionId, clientId);

    if (adapter === 'playwright') {
        const { chromium } = await import('playwright-core');
        const isLocal = (session as any).config?.local === true;
        let wsUrl = session.websocketUrl;
        // Reconstruct credentials for cloud sessions (stripped during disk save)
        if (wsUrl.startsWith('wss://') && !new URL(wsUrl).username) {
            const config = new ConfigManager();
            const creds = config.getCredentials();
            if (creds.username && creds.accessKey) {
                const parsed = new URL(wsUrl);
                parsed.username = creds.username;
                parsed.password = creds.accessKey;
                wsUrl = parsed.toString();
            }
        }
        const browser = isLocal
            ? await chromium.connectOverCDP(wsUrl)
            : await chromium.connect(wsUrl);
        const contexts = browser.contexts();
        const context = contexts[0] || await browser.newContext();
        const pages = context.pages();

        // 1. Try to find the page matching the last navigated URL
        let page = lastUrl ? pages.find((p: any) => p.url() === lastUrl) : undefined;
        // 2. Fall back to any page with a real URL
        if (!page) page = pages.find((p: any) => isRealUrl(p.url()));
        // 3. Fall back to last page or create new (safe: check length first)
        if (!page && pages.length > 0) page = pages[pages.length - 1];
        if (!page) page = await context.newPage();

        // If we have a last known URL and the page isn't on it, navigate there
        const pwUrl = page.url();
        if (lastUrl && (!isRealUrl(pwUrl) || !pwUrl.startsWith(lastUrl.replace(/\/$/, '')))) {
            await page.goto(lastUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        }
        // Ensure DOM is ready (parity with Puppeteer path)
        await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

        return {
            page,
            framework: 'playwright',
            cleanup: async () => {
                // For both local and cloud: browser.close() is safe.
                // Playwright's connect() sets _shouldCloseConnectionOnClose = true,
                // so close() severs the local WebSocket transport without killing
                // the remote browser process.
                await browser.close().catch(() => {});
            },
        };
    } else {
        // Reconstruct credentials for cloud sessions (stripped during disk save)
        let wsUrl = session.websocketUrl;
        if (wsUrl.startsWith('wss://') && !new URL(wsUrl).username) {
            const config = new ConfigManager();
            const creds = config.getCredentials();
            if (creds.username && creds.accessKey) {
                const parsed = new URL(wsUrl);
                parsed.username = creds.username;
                parsed.password = creds.accessKey;
                wsUrl = parsed.toString();
            }
        }
        const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
        const pages = await browser.pages();

        // 1. Try to find the page matching the last navigated URL
        let page = lastUrl ? pages.find(p => p.url() === lastUrl) : undefined;
        // 2. Fall back to any page with a real URL
        if (!page) page = pages.find(p => isRealUrl(p.url()));
        // 3. Fall back to last page or create new (safe: check length first)
        if (!page && pages.length > 0) page = pages[pages.length - 1];
        if (!page) page = await browser.newPage();

        // Puppeteer CDP reconnection may leave the page on a different tab.
        // Only navigate if the page isn't already on the expected URL.
        const currentUrl = page.url();
        if (lastUrl && !currentUrl.startsWith(lastUrl.replace(/\/$/, ''))) {
            await page.goto(lastUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        }
        // Ensure DOM is ready
        await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

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
