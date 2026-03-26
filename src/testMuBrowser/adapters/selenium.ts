
import { Builder, WebDriver, Capabilities } from 'selenium-webdriver';
import { Session } from '../types.js';

const LT_HUB_URL = 'https://hub.lambdatest.com/wd/hub';

export class SeleniumAdapter {
    async connect(session: Session): Promise<WebDriver> {
        console.log(`Selenium Adapter: Connecting to session ${session.id}...`);

        const username = process.env.LT_USERNAME;
        const accessKey = process.env.LT_ACCESS_KEY;

        if (!username || !accessKey) {
            throw new Error('Selenium Adapter: LT_USERNAME and LT_ACCESS_KEY environment variables are required');
        }

        // Build LT:Options from session config
        const config = session.config;
        const userLtOptions = config.lambdatestOptions?.['LT:Options'] || {};
        const { 'LT:Options': _removed, ...restLambdatestOptions } = config.lambdatestOptions || {};

        const ltOptions: any = {
            platformName: 'Windows 10',
            project: 'testMuBrowser',
            w3c: true,
            plugin: 'node-js-selenium',
            username,
            accessKey,
            ...restLambdatestOptions,
            ...userLtOptions
        };

        if (config.dimensions) {
            ltOptions.resolution = `${config.dimensions.width}x${config.dimensions.height}`;
        }

        if (config.headless !== undefined) {
            ltOptions.headless = config.headless;
        }

        // Build Chrome options args for UA and viewport
        const chromeArgs: string[] = [];

        if (config.userAgent || session.userAgent) {
            const ua = config.userAgent || session.userAgent;
            chromeArgs.push(`--user-agent=${ua}`);
        }

        if (config.dimensions) {
            chromeArgs.push(`--window-size=${config.dimensions.width},${config.dimensions.height}`);
        }

        // Build W3C capabilities
        const capabilities: any = {
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': ltOptions
        };

        if (chromeArgs.length > 0) {
            capabilities['goog:chromeOptions'] = { args: chromeArgs };
        }

        console.log(`Selenium Adapter: Connecting to LambdaTest hub...`);

        let driver: WebDriver;

        try {
            driver = await new Builder()
                .usingServer(LT_HUB_URL)
                .withCapabilities(capabilities)
                .build();

            console.log('Selenium Adapter: Connected successfully!');
        } catch (e: any) {
            console.error('Selenium Adapter: Connection failed');
            console.error('Error:', e.message);
            throw e;
        }

        // Get LambdaTest dashboard URL
        try {
            const seleniumSession = await driver.getSession();
            const testId = seleniumSession.getId();
            await this.fetchDashboardUrl(session, username, accessKey, testId);
        } catch {
            // Best effort — don't fail the connection if we can't get the URL
        }

        // Profile persistence: load cookies
        if (config.profileId) {
            console.log(`Selenium Adapter: Loading profile ${config.profileId}`);
            await this.loadProfile(config.profileId, driver);

            // Wrap driver.quit() to auto-save cookies before quitting
            const originalQuit = driver.quit.bind(driver);
            driver.quit = async () => {
                console.log(`Selenium Adapter: Saving profile ${config.profileId} on quit...`);
                try {
                    await this.saveProfile(config.profileId!, driver);
                } catch (err) {
                    console.error('Selenium Adapter: Failed to save profile on quit', err);
                }
                return originalQuit();
            };
        }

        return driver;
    }

    private async fetchDashboardUrl(session: Session, username: string, accessKey: string, testId: string): Promise<void> {
        try {
            const https = await import('https');
            const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');

            const data: string = await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: 'api.lambdatest.com',
                    path: '/automation/api/v1/sessions?limit=5',
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
                // Match by the known testID from the driver session
                const match = json.data.find((s: any) => (s.test_id === testId || s.session_id === testId));
                const entry = match || json.data[0];
                const resolvedTestId = entry.test_id || entry.session_id || testId;
                const buildId = entry.build_id;

                if (buildId) {
                    const url = `https://automation.lambdatest.com/test?build=${buildId}&testID=${resolvedTestId}`;
                    session.sessionViewerUrl = url;
                    console.log(`Selenium Adapter: LambdaTest Dashboard: ${url}`);
                }
            }
        } catch {
            // Best effort
        }
    }

    private async loadProfile(profileId: string, driver: WebDriver): Promise<void> {
        const fs = await import('fs-extra');
        const path = await import('path');
        const PROFILES_DIR = path.join(process.cwd(), '.profiles');
        const filePath = path.join(PROFILES_DIR, `${profileId}.json`);

        if (!fs.existsSync(filePath)) {
            console.log(`Selenium Adapter: Profile ${profileId} not found, skipping load`);
            return;
        }

        try {
            const data = await fs.readJson(filePath);

            if (data.cookies && data.cookies.length > 0) {
                // Group cookies by domain so we can navigate to each domain first
                const domainMap = new Map<string, any[]>();
                for (const cookie of data.cookies) {
                    const domain = cookie.domain || 'unknown';
                    const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;
                    if (!domainMap.has(cleanDomain)) {
                        domainMap.set(cleanDomain, []);
                    }
                    domainMap.get(cleanDomain)!.push(cookie);
                }

                let loadedCount = 0;
                for (const [domain, cookies] of domainMap) {
                    if (domain === 'unknown') continue;

                    try {
                        // Navigate to the domain so cookies can be set
                        await driver.get(`https://${domain}`);

                        for (const c of cookies) {
                            try {
                                const seleniumCookie: any = {
                                    name: c.name,
                                    value: c.value,
                                    path: c.path || '/',
                                    secure: c.secure || false,
                                    httpOnly: c.httpOnly || false
                                };

                                if (c.domain) {
                                    seleniumCookie.domain = c.domain;
                                }
                                if (c.expires && c.expires > 0) {
                                    seleniumCookie.expiry = Math.floor(c.expires);
                                }
                                if (c.sameSite) {
                                    seleniumCookie.sameSite = c.sameSite;
                                }

                                await driver.manage().addCookie(seleniumCookie);
                                loadedCount++;
                            } catch (cookieErr: any) {
                                console.warn(`Selenium Adapter: Failed to add cookie ${c.name}: ${cookieErr.message}`);
                            }
                        }
                    } catch (navErr: any) {
                        console.warn(`Selenium Adapter: Failed to navigate to ${domain}: ${navErr.message}`);
                    }
                }

                console.log(`Selenium Adapter: Loaded ${loadedCount} cookies`);
            }
        } catch (e: any) {
            console.error(`Selenium Adapter: Error loading profile: ${e.message}`);
        }
    }

    private async saveProfile(profileId: string, driver: WebDriver): Promise<void> {
        const fs = await import('fs-extra');
        const path = await import('path');
        const PROFILES_DIR = path.join(process.cwd(), '.profiles');

        await fs.ensureDir(PROFILES_DIR);
        const filePath = path.join(PROFILES_DIR, `${profileId}.json`);

        try {
            const cookies = await driver.manage().getCookies();
            await fs.writeJson(filePath, {
                id: profileId,
                cookies,
                updatedAt: new Date().toISOString()
            }, { spaces: 2 });
            console.log(`Selenium Adapter: Saved ${cookies.length} cookies to profile`);
        } catch (e: any) {
            console.error(`Selenium Adapter: Error saving profile: ${e.message}`);
        }
    }
}
