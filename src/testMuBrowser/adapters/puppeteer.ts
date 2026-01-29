
import puppeteer, { Browser, Page } from 'puppeteer-core';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ProfileService } from '../profile-service.js';
import { Session } from '../types.js';
import { getRandomUserAgent, getRandomizedViewport } from '../stealth-utils.js';

puppeteerExtra.use(StealthPlugin());

export class PuppeteerAdapter {
    private profileService: ProfileService;

    constructor() {
        this.profileService = new ProfileService();
    }

    async connect(session: Session): Promise<Browser> {
        console.log(`Adapter: Connecting to session ${session.id} via Puppeteer...`);

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

                // Apply to future pages
                browser.on('targetcreated', async (target) => {
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
                });
                console.log('Adapter: Humanized interactions enabled');
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
