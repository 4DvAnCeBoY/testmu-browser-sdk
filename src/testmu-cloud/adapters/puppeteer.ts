
import puppeteer, { Browser, Page } from 'puppeteer-core';
import puppeteerExtra from '../utils/puppeteer-extra.js';
import { ProfileService } from '../profile-service.js';
import { HeartbeatService } from '../services/heartbeat-service.js';
import { Session } from '../types.js';
import { getRandomUserAgent, getRandomizedViewport } from '../stealth-utils.js';
import { fetchDashboardUrl } from '../utils/lambdatest-api.js';

export class PuppeteerAdapter {
    private profileService: ProfileService;
    private heartbeatService: HeartbeatService | null = null;

    constructor() {
        this.profileService = new ProfileService();
    }

    setHeartbeatService(service: HeartbeatService): void {
        this.heartbeatService = service;
    }

    async connect(session: Session): Promise<Browser> {
        console.error(`Adapter: Connecting to session ${session.id} via Puppeteer...`);

        const stealthConfig = session.stealthConfig || session.config.stealthConfig;
        const skipFingerprint = stealthConfig?.skipFingerprintInjection === true;

        let browser: Browser;
        try {
            if (skipFingerprint) {
                // Raw puppeteer without stealth plugin
                console.log('Adapter: Skipping fingerprint injection (raw puppeteer)');
                browser = await puppeteer.connect({
                    browserWSEndpoint: session.websocketUrl,
                });
            } else {
                // Apply Stealth by using puppeteer-extra
                browser = await puppeteerExtra.connect({
                    browserWSEndpoint: session.websocketUrl,
                }) as unknown as Browser;
            }
        } catch (e) {
            console.error("Puppeteer Adapter: Connection failed", e);
            throw e;
        }

        // Fetch LambdaTest dashboard URL (best effort, cloud sessions only)
        if (!session.config.local && !session.config.customWebSocketUrl) {
            await fetchDashboardUrl(session);
        }

        // Apply stealth UA / viewport if stealth is configured
        if (stealthConfig) {
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : await browser.newPage();

            // Random user-agent
            if (stealthConfig.randomizeUserAgent !== false) {
                const ua = session.userAgent || getRandomUserAgent();
                await page.setUserAgent(ua);
                console.log(`Adapter: Set stealth user-agent: ${ua.substring(0, 50)}...`);
            }

            // Random viewport
            if (stealthConfig.randomizeViewport !== false) {
                const dims = session.dimensions || { width: 1920, height: 1080 };
                const vp = getRandomizedViewport(dims.width, dims.height);
                await page.setViewport(vp);
                console.log(`Adapter: Set stealth viewport: ${vp.width}x${vp.height}`);
            }

            // Humanize interactions
            if (stealthConfig.humanizeInteractions) {
                this.applyHumanize(page);

                // Apply to future pages — store reference for cleanup on disconnect
                const targetCreatedListener = async (target: any) => {
                    if (target.type() === 'page') {
                        const newPage = await target.page();
                        if (newPage) {
                            this.applyHumanize(newPage);

                            if (stealthConfig.randomizeUserAgent !== false) {
                                const ua = session.userAgent || getRandomUserAgent();
                                await newPage.setUserAgent(ua);
                            }
                            if (stealthConfig.randomizeViewport !== false) {
                                const dims = session.dimensions || { width: 1920, height: 1080 };
                                const vp = getRandomizedViewport(dims.width, dims.height);
                                await newPage.setViewport(vp);
                            }
                        }
                    }
                };
                browser.on('targetcreated', targetCreatedListener);

                // Clean up listener on disconnect to prevent leaks
                browser.on('disconnected', () => {
                    browser.off('targetcreated', targetCreatedListener);
                });
                console.error('Adapter: Humanized interactions enabled');
            }
        }

        // Apply Persistence
        if (session.config.profileId) {
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : await browser.newPage();

            console.log(`Adapter: Loading profile ${session.config.profileId}`);
            await this.profileService.loadProfile(session.config.profileId, page);

            // Wrap browser.close to save profile
            const originalClose = browser.close.bind(browser);
            browser.close = async () => {
                console.log(`Adapter: Saving profile ${session.config.profileId} on close...`);
                try {
                    const currentPages = await browser.pages();
                    if (currentPages.length > 0) {
                        await this.profileService.saveProfile(session.config.profileId!, currentPages[0]);
                    } else {
                        console.warn("Adapter: No pages open to save profile.");
                    }
                } catch (err) {
                    console.error("Adapter: Failed to save profile on close", err);
                }
                return originalClose();
            };
        }

        // Start heartbeat for cloud sessions to prevent idle-timeout
        if (this.heartbeatService && !session.config.local && !session.config.customWebSocketUrl) {
            const heartbeatInterval = session.config.heartbeatInterval;
            if (heartbeatInterval !== 0) {
                const intervalMs = (heartbeatInterval || 60) * 1000;
                const pages = await browser.pages();
                const heartbeatPage = pages[0] || await browser.newPage();
                this.heartbeatService.start(session.id, async () => {
                    await heartbeatPage.evaluate('1');
                }, intervalMs);
            }
        }

        return browser;
    }

    /**
     * Monkey-patch page.click() and page.type() to add random human-like delays.
     */
    private applyHumanize(page: Page): void {
        const originalClick = page.click.bind(page);
        const originalType = page.type.bind(page);

        (page as any).click = async (selector: string, options?: any) => {
            // Random delay before click: 50-150ms
            await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
            return originalClick(selector, options);
        };

        (page as any).type = async (selector: string, text: string, options?: any) => {
            // Type character by character with random delay: 30-130ms per char
            const delay = 30 + Math.random() * 100;
            return originalType(selector, text, { ...options, delay });
        };
    }
}
