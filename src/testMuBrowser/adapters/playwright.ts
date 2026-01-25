
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import { ProfileService } from '../profile-service.js';
import { Session } from '../types.js';

export class PlaywrightAdapter {
    private profileService: ProfileService;

    constructor() {
        this.profileService = new ProfileService();
    }

    async connect(session: Session): Promise<{ browser: Browser, context: BrowserContext, page: Page }> {
        console.log(`Playwright Adapter: Connecting to session ${session.id}...`);

        let browser: Browser;
        try {
            if (session.config.local) {
                // For local, we often launch persistent context or connect to CDP
                // Since SessionManager launched a browser instance for us (puppeteer based), 
                // we can connect to its WS using Playwright too!
                browser = await chromium.connectOverCDP(session.websocketUrl);
            } else {
                browser = await chromium.connect(session.websocketUrl);
            }
        } catch (e) {
            console.error("Playwright Adapter: Connection failed", e);
            throw e;
        }

        // Get or Create Context/Page
        const contexts = browser.contexts();
        const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
        const pages = context.pages();
        const page = pages.length > 0 ? pages[0] : await context.newPage();

        // Apply Persistence
        if (session.config.profileId) {
            console.log(`Playwright Adapter: Loading profile ${session.config.profileId}`);
            // Note: ProfileService currently expects a Puppeteer Page (with .evaluate)
            // We need to either make ProfileService generic or use a helper.
            // Playwright Page API is similar but not identical.

            // Simplest way: Re-implement load for Playwright here or Adapt the interface.
            // Let's implement specific load logic for Playwright for now to avoid breaking existing code.
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

    private async loadProfile(profileId: string, context: BrowserContext) {
        // We reuse the basic logic: Read JSON, inject cookies
        const fs = await import('fs-extra');
        const path = await import('path');
        const PROFILES_DIR = path.join(process.cwd(), '.profiles');
        const filePath = path.join(PROFILES_DIR, `${profileId}.json`);

        if (!fs.existsSync(filePath)) return;
        const data = await fs.readJson(filePath);

        if (data.cookies) {
            await context.addCookies(data.cookies.map((c: any) => ({
                ...c,
                url: c.domain ? `https://${c.domain.startsWith('.') ? c.domain.substring(1) : c.domain}` : undefined
                // Playwright needs 'url' or 'domain' differently handled sometimes
            })));
        }

        // localStorage injection (Needs a page)
        // ... omitted for brevity in this initial pass, usually Cookies are enough for Auth.
    }

    private async saveProfile(profileId: string, context: BrowserContext) {
        const fs = await import('fs-extra');
        const path = await import('path');
        const PROFILES_DIR = path.join(process.cwd(), '.profiles');
        const filePath = path.join(PROFILES_DIR, `${profileId}.json`);

        const cookies = await context.cookies();
        await fs.writeJson(filePath, { cookies }, { spaces: 2 });
    }
}
