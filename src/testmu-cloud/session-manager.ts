
import crypto from 'crypto';
import { Browser } from 'puppeteer-core';
import {
    SessionConfig,
    Session,
    ReleaseResponse,
    LiveDetailsResponse,
    PageInfo
} from './types.js';
import { TunnelService } from './services/tunnel-service.js';
import { LocalBrowserService } from './services/local-browser-service.js';
import { EventsService } from './services/events-service.js';
import { ExtensionService } from './services/extension-service.js';
import { getRandomUserAgent } from './stealth-utils.js';

export class SessionManager {
    private tunnelService: TunnelService | null = null;
    private extensionService: ExtensionService | null = null;
    private eventsService: EventsService;
    private managedTunnelName: string | null = null;
    private onReleaseHooks: Array<(sessionId: string) => void> = [];

    constructor() {
        this.eventsService = new EventsService();
    }

    /**
     * Register a callback invoked when a session is released.
     * Used by Browser to wire service-level cleanup (network, snapshot, captcha, etc.).
     */
    onRelease(hook: (sessionId: string) => void): void {
        this.onReleaseHooks.push(hook);
    }

    setTunnelService(service: TunnelService) {
        this.tunnelService = service;
    }

    setExtensionService(service: ExtensionService) {
        this.extensionService = service;
    }

    async createSession(config: SessionConfig): Promise<Session> {
        // Generate unique session ID with timestamp + random suffix
        const sessionId = config.sessionId || `session_${crypto.randomUUID()}`;
        const createdAt = new Date().toISOString();

        // Auto-pick a random user-agent if stealth is configured and no explicit UA is set
        let resolvedUserAgent = config.userAgent;
        if (config.stealthConfig && config.stealthConfig.randomizeUserAgent !== false && !config.userAgent) {
            resolvedUserAgent = getRandomUserAgent();
            console.error(`SessionManager: Auto-selected stealth user-agent: ${resolvedUserAgent.substring(0, 50)}...`);
        }

        if (config.customWebSocketUrl) {
            // Bring Your Own Browser (BYOB)
            try {
                console.error(`Connecting to custom WebSocket at: ${new URL(config.customWebSocketUrl).host}`);
            } catch {
                console.error('Connecting to custom WebSocket URL');
            }
            const session: Session = {
                id: sessionId,
                websocketUrl: config.customWebSocketUrl,
                debugUrl: 'about:blank',
                config,
                status: 'live',
                createdAt,
                timeout: config.timeout || 300000,
                dimensions: config.dimensions || { width: 1920, height: 1080 }
            };
            SessionStore.start(session, null);
            this.eventsService.startRecording(sessionId);
            return session;
        }

        if (config.local) {
            // Launch local browser using chrome-launcher (Auto-discovery)
            console.error("Launching local browser (auto-discovery)...");

            const localService = new LocalBrowserService();
            const { websocketUrl, port, kill, pid, profileDir } = await localService.launch();

            // Persist Chrome PID so a separate CLI process can kill it on session release
            await LocalBrowserService.savePidFile(sessionId, pid, profileDir);

            const debugUrl = `http://localhost:${port}`;
            const session: Session = {
                id: sessionId,
                websocketUrl: websocketUrl,
                debugUrl,
                sessionViewerUrl: debugUrl,
                config,
                status: 'live',
                createdAt,
                timeout: config.timeout || 300000,
                dimensions: config.dimensions || { width: 1920, height: 1080 },
                headless: config.headless,
                stealthConfig: config.stealthConfig,
                userAgent: resolvedUserAgent
            };

            SessionStore.start(session, null, kill);
            this.eventsService.startRecording(sessionId);
            return session;

        } else {
            // LambdaTest
            const username = process.env.LT_USERNAME;
            const accessKey = process.env.LT_ACCESS_KEY;

            if (!username || !accessKey) {
                throw new Error('LambdaTest credentials not configured. Set LT_USERNAME and LT_ACCESS_KEY environment variables, or run "testmu-browser-cloud setup".');
            }

            // Map adapter to LambdaTest plugin name and WebSocket endpoint
            const adapter = config.adapter || 'puppeteer';
            const adapterPluginMap: Record<string, string> = {
                'puppeteer': 'node-js-puppeteer',
                'playwright': 'node-js-playwright',
                'selenium': 'node-js-selenium'
            };
            const adapterEndpointMap: Record<string, string> = {
                'puppeteer': 'puppeteer',
                'playwright': 'playwright',
                'selenium': 'selenium'
            };
            const plugin = adapterPluginMap[adapter];
            const wsEndpointPath = adapterEndpointMap[adapter];

            // Extract user's LT:Options if nested inside lambdatestOptions
            const userLtOptions = config.lambdatestOptions?.['LT:Options'] || {};
            const { 'LT:Options': _removed, ...restLambdatestOptions } = config.lambdatestOptions || {};

            const ltOptions: any = {
                platformName: 'Windows 10',
                project: 'browser-cloud',
                w3c: true,
                plugin,
                ...restLambdatestOptions,
                ...userLtOptions
            };

            // Handle proxy configuration
            if (config.proxy || config.proxyUrl) {
                ltOptions.proxy = config.proxy || config.proxyUrl;
            }

            // Handle tunnel
            if (config.tunnel) {
                ltOptions.tunnel = true;
                if (config.tunnelName) {
                    ltOptions.tunnelName = config.tunnelName;
                } else if (this.tunnelService) {
                    if (!this.tunnelService.getStatus()) {
                        this.managedTunnelName = `browser-cloud_Managed_${Date.now()}`;
                        await this.tunnelService.start({
                            user: username,
                            key: accessKey,
                            tunnelName: this.managedTunnelName
                        });
                    }
                    ltOptions.tunnelName = this.managedTunnelName;
                } else {
                    console.warn("Tunnel requested but TunnelService not initialized.");
                }
            }

            // Handle geolocation
            if (config.geoLocation) {
                ltOptions.geoLocation = config.geoLocation;
            }

            // Handle region
            if (config.region) {
                ltOptions.region = config.region;
            }

            // Handle resolution/dimensions
            if (config.dimensions) {
                ltOptions.resolution = `${config.dimensions.width}x${config.dimensions.height}`;
            }

            // Handle headless
            if (config.headless !== undefined) {
                ltOptions.headless = config.headless;
            }

            // Handle idle timeout (in seconds, default 900 = 15 min)
            ltOptions.idleTimeout = config.idleTimeout ?? 900;

            // Handle extensions via extensionIds config
            if (config.extensionIds && config.extensionIds.length > 0 && this.extensionService) {
                const cloudUrls = await this.extensionService.getCloudUrls(config.extensionIds);
                if (cloudUrls.length > 0) {
                    // Merge with any existing lambda:loadExtension URLs
                    const existing = ltOptions['lambda:loadExtension'] || [];
                    ltOptions['lambda:loadExtension'] = [...existing, ...cloudUrls];
                    console.error(`Loading ${cloudUrls.length} extension(s) into session`);
                }
            }

            const capabilities = {
                browserName: 'Chrome',
                browserVersion: 'latest',
                'LT:Options': ltOptions
            };

            // LambdaTest requires authentication in the URL
            // Use correct endpoint based on adapter (puppeteer/playwright/selenium)
            const wsEndpoint = `wss://${username}:${accessKey}@cdp.lambdatest.com/${wsEndpointPath}?capabilities=${encodeURIComponent(
                JSON.stringify(capabilities)
            )}`;

            const session: Session = {
                id: sessionId,
                websocketUrl: wsEndpoint,
                debugUrl: "https://automation.lambdatest.com/logs/",
                sessionViewerUrl: "https://automation.lambdatest.com/logs/",
                config,
                status: 'live',
                createdAt,
                timeout: config.timeout || 300000,
                dimensions: config.dimensions || { width: 1920, height: 1080 },
                headless: config.headless,
                isSelenium: config.isSelenium,
                persistProfile: config.persistProfile,
                profileId: config.profileId,
                region: config.region,
                solveCaptcha: config.solveCaptcha,
                stealthConfig: config.stealthConfig,
                userAgent: resolvedUserAgent
            };

            SessionStore.start(session, null);
            this.eventsService.startRecording(sessionId);
            return session;
        }
    }

    listSessions(): Session[] {
        return SessionStore.list();
    }

    getSession(id: string): Session | undefined {
        return SessionStore.get(id)?.session;
    }

    async releaseSession(id: string): Promise<ReleaseResponse> {
        const entry = SessionStore.get(id);
        if (entry) {
            console.error(`Closing session ${id}`);

            // Stop recording and clean up events
            this.eventsService.stopRecording(id);

            // Notify release hooks (service cleanup)
            for (const hook of this.onReleaseHooks) {
                try { hook(id); } catch { /* ignore cleanup errors */ }
            }

            // Update session status
            entry.session.status = 'released';

            if (entry.cleanup) {
                await entry.cleanup();
            } else if (entry.browser) {
                await entry.browser.close();
            }
            SessionStore.delete(id);

            // Kill local Chrome process if this was a local session (cross-process cleanup)
            await LocalBrowserService.killFromPidFile(id);

            return { success: true, message: `Session ${id} released` };
        }
        return { success: false, message: `Session ${id} not found` };
    }

    /**
     * Release all active sessions
     */
    async releaseAll(): Promise<ReleaseResponse> {
        const sessions = SessionStore.list();
        let releasedCount = 0;

        for (const session of sessions) {
            try {
                await this.releaseSession(session.id);
                releasedCount++;
            } catch (e) {
                console.error(`Error releasing session ${session.id}:`, e);
            }
        }

        return {
            success: true,
            message: `Released ${releasedCount} sessions`
        };
    }

    /**
     * Get recorded events for a session (RRWeb format)
     */
    getSessionEvents(id: string) {
        return this.eventsService.getEvents(id);
    }

    /**
     * Get event count for a session
     */
    getEventCount(id: string): number {
        return this.eventsService.getEventCount(id);
    }

    /**
     * Get live details for a session (pages, tabs, state)
     */
    async getLiveDetails(id: string): Promise<LiveDetailsResponse | null> {
        const entry = SessionStore.get(id);
        if (!entry || !entry.session) {
            return null;
        }

        const session = entry.session;

        // For now, return basic info
        // Full implementation would track open pages via CDP
        const pages: PageInfo[] = [{
            id: 'page_0',
            url: 'about:blank',
            title: 'Browser Tab',
            favicon: null,
            sessionViewerUrl: session.sessionViewerUrl || session.debugUrl,
            sessionViewerFullscreenUrl: session.sessionViewerUrl || session.debugUrl
        }];

        // Strip credentials from WebSocket URL before exposing
        let safeWsUrl = session.websocketUrl;
        try {
            const parsed = new URL(session.websocketUrl);
            parsed.username = '';
            parsed.password = '';
            safeWsUrl = parsed.toString();
        } catch {
            // Not a valid URL — return as-is
        }

        return {
            pages,
            wsUrl: safeWsUrl,
            sessionViewerUrl: session.sessionViewerUrl || session.debugUrl,
            sessionViewerFullscreenUrl: session.sessionViewerUrl || session.debugUrl
        };
    }
}

// Enhanced Session Store to support list/retrieve parity
class SessionRepository {
    private sessions = new Map<string, { session: Session, browser: Browser | null, cleanup?: () => Promise<void> }>();

    start(session: Session, browser: Browser | null, cleanup?: () => Promise<void>) {
        this.sessions.set(session.id, { session, browser, cleanup });
    }

    get(id: string) {
        return this.sessions.get(id);
    }

    delete(id: string) {
        this.sessions.delete(id);
    }

    list(): Session[] {
        return Array.from(this.sessions.values()).map(data => data.session);
    }

    getAll() {
        return Array.from(this.sessions.values());
    }

    count(): number {
        return this.sessions.size;
    }
}

const SessionStore = new SessionRepository();
