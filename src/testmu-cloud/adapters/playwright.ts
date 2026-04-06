
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import { ProfileService } from '../profile-service.js';
import { HeartbeatService } from '../services/heartbeat-service.js';
import { Session, StealthConfig } from '../types.js';
import { getRandomUserAgent, getRandomizedViewport } from '../stealth-utils.js';
import { fetchDashboardUrl } from '../utils/lambdatest-api.js';

export class PlaywrightAdapter {
    private profileService: ProfileService;
    private heartbeatService: HeartbeatService | null = null;

    constructor() {
        this.profileService = new ProfileService();
    }

    setHeartbeatService(service: HeartbeatService): void {
        this.heartbeatService = service;
    }

    async connect(session: Session): Promise<{ browser: Browser, context: BrowserContext, page: Page }> {
        console.error(`Playwright Adapter: Connecting to session ${session.id}...`);
        try {
            console.error(`Playwright Adapter: WebSocket host: ${new URL(session.websocketUrl).host}`);
        } catch {
            console.error('Playwright Adapter: WebSocket URL available');
        }

        const stealthConfig = session.stealthConfig || session.config.stealthConfig;

        let browser: Browser;

        try {
            if (session.config.local) {
                // For local browser launched via chrome-launcher, use CDP
                console.log('Playwright Adapter: Using connectOverCDP for local browser...');
                browser = await chromium.connectOverCDP(session.websocketUrl);
            } else {
                // For LambdaTest cloud, use connect with the playwright endpoint
                console.log('Playwright Adapter: Using connect for LambdaTest cloud...');
                browser = await chromium.connect(session.websocketUrl, {
                    timeout: 60000
                });
            }
            console.log('Playwright Adapter: Connected successfully!');
        } catch (e: any) {
            console.error("Playwright Adapter: Connection failed");
            console.error("Error:", e.message);
            throw e;
        }

        // Fetch LambdaTest dashboard URL (best effort, cloud sessions only)
        if (!session.config.local && !session.config.customWebSocketUrl) {
            await fetchDashboardUrl(session);
        }

        // Get or Create Context/Page
        let context: BrowserContext;
        let page: Page;

        try {
            const contexts = browser.contexts();
            console.log(`Playwright Adapter: Found ${contexts.length} existing context(s)`);

            if (contexts.length > 0) {
                context = contexts[0];
            } else {
                console.log('Playwright Adapter: Creating new context...');
                context = await browser.newContext();
            }

            const pages = context.pages();
            console.log(`Playwright Adapter: Found ${pages.length} existing page(s)`);

            if (pages.length > 0) {
                page = pages[0];
            } else {
                console.log('Playwright Adapter: Creating new page...');
                page = await context.newPage();
            }
        } catch (e: any) {
            console.error("Playwright Adapter: Failed to get context/page");
            console.error("Error:", e.message);
            throw e;
        }

        // Apply Stealth
        if (stealthConfig) {
            // Inject stealth scripts into the current page and future pages
            await this.applyStealthScripts(page);
            context.on('page', async (newPage) => {
                await this.applyStealthScripts(newPage);
                if (stealthConfig.humanizeInteractions) {
                    this.applyHumanize(newPage);
                }
            });
            console.log('Playwright Adapter: Stealth scripts injected');

            // Random user-agent — must be set at context creation for persistence across navigations.
            // page.evaluate() modifications to navigator are wiped on navigation.
            if (stealthConfig.randomizeUserAgent !== false) {
                const ua = session.userAgent || getRandomUserAgent();
                if (browser.contexts().length === 0) {
                    // Context was just created above — we can't retroactively set UA on existing context,
                    // but addInitScript persists across navigations within the context.
                    await context.addInitScript((uaStr: string) => {
                        Object.defineProperty(navigator, 'userAgent', { get: () => uaStr });
                    }, ua);
                    console.error(`Playwright Adapter: Set stealth user-agent via initScript: ${ua.substring(0, 50)}...`);
                } else {
                    // Context already existed — addInitScript still works for future navigations,
                    // but the current page won't reflect it until next navigation.
                    await context.addInitScript((uaStr: string) => {
                        Object.defineProperty(navigator, 'userAgent', { get: () => uaStr });
                    }, ua);
                    console.warn(`Playwright Adapter: UA override applied via initScript but won't take effect until next navigation (context already existed)`);
                }
            }

            // Random viewport
            if (stealthConfig.randomizeViewport !== false) {
                const dims = session.dimensions || { width: 1920, height: 1080 };
                const vp = getRandomizedViewport(dims.width, dims.height);
                await page.setViewportSize(vp);
                console.log(`Playwright Adapter: Set stealth viewport: ${vp.width}x${vp.height}`);
            }

            // Humanize interactions
            if (stealthConfig.humanizeInteractions) {
                this.applyHumanize(page);
                console.log('Playwright Adapter: Humanized interactions enabled');
            }
        }

        // Apply Profile Persistence
        if (session.config.profileId) {
            console.log(`Playwright Adapter: Loading profile ${session.config.profileId}`);
            await this.loadProfile(session.config.profileId, context);

            // Save on close
            const originalClose = browser.close.bind(browser);
            browser.close = async () => {
                console.log(`Playwright Adapter: Saving profile ${session.config.profileId} on close...`);
                try {
                    await this.saveProfile(session.config.profileId!, context);
                } catch (err) {
                    console.error("Playwright Adapter: Failed to save profile", err);
                }
                return originalClose();
            };
        }

        // Start heartbeat for cloud sessions to prevent idle-timeout
        if (this.heartbeatService && !session.config.local && !session.config.customWebSocketUrl) {
            const heartbeatInterval = session.config.heartbeatInterval;
            if (heartbeatInterval !== 0) {
                const intervalMs = (heartbeatInterval || 60) * 1000;
                this.heartbeatService.start(session.id, async () => {
                    const pages = context.pages();
                    if (pages.length > 0) {
                        await pages[0].evaluate('1');
                    }
                }, intervalMs);
            }
        }

        return { browser, context, page };
    }

    /**
     * Inject stealth evasion scripts into a Playwright page via addInitScript.
     * These scripts patch common bot-detection fingerprints.
     */
    private async applyStealthScripts(page: Page): Promise<void> {
        await page.addInitScript(() => {
            // 1. Hide navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            // 2. Fake chrome.runtime (makes it look like a real Chrome extension environment)
            if (!(window as any).chrome) {
                (window as any).chrome = {};
            }
            (window as any).chrome.runtime = {
                connect: () => {},
                sendMessage: () => {},
                onMessage: { addListener: () => {}, removeListener: () => {} },
            };

            // 3. Fake navigator.plugins (3 standard Chrome plugins)
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const fakePlugins = [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
                        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 2 },
                    ];
                    const pluginArray = Object.create(PluginArray.prototype);
                    fakePlugins.forEach((p, i) => {
                        pluginArray[i] = p;
                    });
                    Object.defineProperty(pluginArray, 'length', { get: () => fakePlugins.length });
                    pluginArray.item = (i: number) => fakePlugins[i] || null;
                    pluginArray.namedItem = (name: string) => fakePlugins.find(p => p.name === name) || null;
                    pluginArray.refresh = () => {};
                    return pluginArray;
                },
            });

            // 4. Set navigator.languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // 5. Patch permissions.query for notifications
            const originalQuery = navigator.permissions.query.bind(navigator.permissions);
            navigator.permissions.query = (parameters: any) => {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: 'denied', onchange: null } as PermissionStatus);
                }
                return originalQuery(parameters);
            };

            // 6. Spoof WebGL vendor/renderer
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (param: number) {
                // UNMASKED_VENDOR_WEBGL
                if (param === 0x9245) return 'Intel Inc.';
                // UNMASKED_RENDERER_WEBGL
                if (param === 0x9246) return 'Intel Iris OpenGL Engine';
                return getParameter.call(this, param);
            };

            const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
            WebGL2RenderingContext.prototype.getParameter = function (param: number) {
                if (param === 0x9245) return 'Intel Inc.';
                if (param === 0x9246) return 'Intel Iris OpenGL Engine';
                return getParameter2.call(this, param);
            };
        });
    }

    /**
     * Monkey-patch page.click(), page.type(), and page.fill() to add human-like delays.
     */
    private applyHumanize(page: Page): void {
        const originalClick = page.click.bind(page);
        const originalType = page.type.bind(page);
        const originalFill = page.fill.bind(page);

        (page as any).click = async (selector: string, options?: any) => {
            await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
            return originalClick(selector, options);
        };

        (page as any).type = async (selector: string, text: string, options?: any) => {
            const delay = 30 + Math.random() * 100;
            return originalType(selector, text, { ...options, delay });
        };

        (page as any).fill = async (selector: string, value: string, options?: any) => {
            await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
            return originalFill(selector, value, options);
        };
    }

    private async loadProfile(profileId: string, context: BrowserContext) {
        const fs = await import('fs-extra');
        const path = await import('path');
        const PROFILES_DIR = path.join(process.cwd(), '.profiles');
        const filePath = path.join(PROFILES_DIR, `${profileId}.json`);

        if (!fs.existsSync(filePath)) {
            console.log(`Playwright Adapter: Profile ${profileId} not found, skipping load`);
            return;
        }

        try {
            const data = await fs.readJson(filePath);

            if (data.cookies && data.cookies.length > 0) {
                // Convert cookies to Playwright format
                const playwrightCookies = data.cookies.map((c: any) => {
                    const cookie: any = {
                        name: c.name,
                        value: c.value,
                        path: c.path || '/',
                        secure: c.secure || false,
                        httpOnly: c.httpOnly || false
                    };

                    // Playwright requires either domain or url
                    if (c.domain) {
                        cookie.domain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
                    }
                    if (c.expires && c.expires > 0) {
                        cookie.expires = c.expires;
                    }
                    if (c.sameSite) {
                        cookie.sameSite = c.sameSite;
                    }

                    return cookie;
                });

                await context.addCookies(playwrightCookies);
                console.log(`Playwright Adapter: Loaded ${playwrightCookies.length} cookies`);
            }
        } catch (e: any) {
            console.error(`Playwright Adapter: Error loading profile: ${e.message}`);
        }
    }

    private async saveProfile(profileId: string, context: BrowserContext) {
        const fs = await import('fs-extra');
        const path = await import('path');
        const PROFILES_DIR = path.join(process.cwd(), '.profiles');

        await fs.ensureDir(PROFILES_DIR);
        const filePath = path.join(PROFILES_DIR, `${profileId}.json`);

        try {
            const cookies = await context.cookies();
            await fs.writeJson(filePath, {
                id: profileId,
                cookies,
                updatedAt: new Date().toISOString()
            }, { spaces: 2 });
            console.log(`Playwright Adapter: Saved ${cookies.length} cookies to profile`);
        } catch (e: any) {
            console.error(`Playwright Adapter: Error saving profile: ${e.message}`);
        }
    }
}
