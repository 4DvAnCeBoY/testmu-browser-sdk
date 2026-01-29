
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import { ProfileService } from '../profile-service.js';
import { Session, StealthConfig } from '../types.js';
import { getRandomUserAgent, getRandomizedViewport } from '../stealth-utils.js';

export class PlaywrightAdapter {
    private profileService: ProfileService;

    constructor() {
        this.profileService = new ProfileService();
    }

    async connect(session: Session): Promise<{ browser: Browser, context: BrowserContext, page: Page }> {
        console.log(`Playwright Adapter: Connecting to session ${session.id}...`);
        console.log(`Playwright Adapter: WebSocket URL: ${session.websocketUrl.substring(0, 60)}...`);

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
            await this.fetchDashboardUrl(session);
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

            // Random user-agent
            if (stealthConfig.randomizeUserAgent !== false) {
                const ua = session.userAgent || getRandomUserAgent();
                await page.evaluate((uaStr) => {
                    Object.defineProperty(navigator, 'userAgent', { get: () => uaStr });
                }, ua);
                console.log(`Playwright Adapter: Set stealth user-agent: ${ua.substring(0, 50)}...`);
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

        return { browser, context, page };
    }

    private async fetchDashboardUrl(session: Session): Promise<void> {
        const username = process.env.LT_USERNAME;
        const accessKey = process.env.LT_ACCESS_KEY;
        if (!username || !accessKey) return;

        try {
            const https = await import('https');
            const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');

            const data: string = await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: 'api.lambdatest.com',
                    path: '/automation/api/v1/sessions?limit=1',
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json'
                    }
                }, (res) => {
                    let body = '';
                    res.on('data', (chunk: any) => body += chunk);
                    res.on('end', () => resolve(body));
                });
                req.on('error', reject);
                req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
                req.end();
            });

            const json = JSON.parse(data);
            if (json.data && json.data.length > 0) {
                const entry = json.data[0];
                const testId = entry.test_id || entry.session_id;
                const buildId = entry.build_id;
                if (testId && buildId) {
                    const url = `https://automation.lambdatest.com/test?build=${buildId}&testID=${testId}`;
                    session.sessionViewerUrl = url;
                    console.log(`Playwright Adapter: LambdaTest Dashboard: ${url}`);
                }
            }
        } catch {
            // Best effort — don't fail the connection if we can't get the URL
        }
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
