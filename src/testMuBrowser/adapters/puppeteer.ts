
import puppeteer, { Browser, Page } from 'puppeteer-core';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ProfileService } from '../profile-service.js';
import { Session } from '../types.js';

puppeteerExtra.use(StealthPlugin());

export class PuppeteerAdapter {
    private profileService: ProfileService;

    constructor() {
        this.profileService = new ProfileService();
    }

    async connect(session: Session): Promise<Browser> {
        console.log(`Adapter: Connecting to session ${session.id} via Puppeteer...`);

        let browser: Browser;
        try {
            // Apply Stealth by using puppeteer-extra
            browser = await puppeteerExtra.connect({
                browserWSEndpoint: session.websocketUrl,
            }) as unknown as Browser;
        } catch (e) {
            console.error("Puppeteer Adapter: Connection failed", e);
            throw e;
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
                    // We need a valid page to extract cookies. 
                    // If the user closed pages, we might need to create one or use the last one.
                    // IMPORTANT: If browser is disconnected, we can't save.
                    // But close() is called *to* disconnect.

                    // Get all pages
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
}
