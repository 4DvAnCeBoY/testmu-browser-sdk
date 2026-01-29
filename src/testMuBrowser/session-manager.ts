
import puppeteer, { Browser } from 'puppeteer-core';
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

    constructor() {
        this.eventsService = new EventsService();
    }

    setTunnelService(service: TunnelService) {
        this.tunnelService = service;
    }

    setExtensionService(service: ExtensionService) {
        this.extensionService = service;
    }

    async createSession(config: SessionConfig): Promise<Session> {
        // Generate unique session ID with timestamp + random suffix
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const sessionId = config.sessionId || `session_${Date.now()}_${randomSuffix}`;
        const createdAt = new Date().toISOString();

        // Auto-pick a random user-agent if stealth is configured and no explicit UA is set
        let resolvedUserAgent = config.userAgent;
        if (config.stealthConfig && config.stealthConfig.randomizeUserAgent !== false && !config.userAgent) {
            resolvedUserAgent = getRandomUserAgent();
            console.log(`SessionManager: Auto-selected stealth user-agent: ${resolvedUserAgent.substring(0, 50)}...`);
        }

        if (config.customWebSocketUrl) {
            // Bring Your Own Browser (BYOB)
            console.log(`Connecting to custom WebSocket URL: ${config.customWebSocketUrl}`);
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
            console.log("Launching local browser (auto-discovery)...");

            const localService = new LocalBrowserService();
            const { websocketUrl, kill } = await localService.launch();

            const session: Session = {
                id: sessionId,
                websocketUrl: websocketUrl,
                debugUrl: "http://localhost:9222",
                sessionViewerUrl: "http://localhost:9222",
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
            const username = process.env.LT_USERNAME || 'generic_user';
            const accessKey = process.env.LT_ACCESS_KEY || 'generic_key';

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

            // Map Steel-like config to LambdaTest capabilities
            const ltOptions: any = {
                platformName: 'Windows 10',
                project: 'testMuBrowser',
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
                    const managedName = `testMuBrowser_Managed_${Date.now()}`;
                    if (!this.tunnelService.getStatus()) {
                        await this.tunnelService.start({
                            user: username,
                            key: accessKey,
                            tunnelName: managedName
                        });
                    }
                    ltOptions.tunnelName = managedName;
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

            // Handle extensions via extensionIds config
            if (config.extensionIds && config.extensionIds.length > 0 && this.extensionService) {
                const cloudUrls = await this.extensionService.getCloudUrls(config.extensionIds);
                if (cloudUrls.length > 0) {
                    // Merge with any existing lambda:loadExtension URLs
                    const existing = ltOptions['lambda:loadExtension'] || [];
                    ltOptions['lambda:loadExtension'] = [...existing, ...cloudUrls];
                    console.log(`Loading ${cloudUrls.length} extension(s) into session`);
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
            console.log(`Closing session ${id}`);

            // Stop recording
            this.eventsService.stopRecording(id);

            // Update session status
            entry.session.status = 'released';

            if (entry.cleanup) {
                await entry.cleanup();
            } else if (entry.browser) {
                await entry.browser.close();
            }
            SessionStore.delete(id);

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

        return {
            pages,
            wsUrl: session.websocketUrl,
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
