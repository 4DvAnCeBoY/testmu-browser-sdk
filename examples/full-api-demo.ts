/**
 * Full API Demo - testMuBrowser with LambdaTest
 * 
 * Complete reference demonstrating ALL available APIs with real website
 * automation on LambdaTest cloud infrastructure.
 * 
 * Real Websites Used:
 * - https://www.saucedemo.com (E-commerce testing)
 * - https://duckduckgo.com (Search automation)
 * - https://httpbin.org (API responses)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/full-api-demo.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

async function main() {
    console.log("═".repeat(60));
    console.log("  testMuBrowser - Full API Demo with LambdaTest");
    console.log("  Real Website Automation Examples");
    console.log("═".repeat(60));

    const client = new testMuBrowser();

    // ========================================
    // 1. SESSION MANAGEMENT
    // ========================================
    console.log("\n\n🔹 1. SESSION MANAGEMENT");
    console.log("─".repeat(50));

    // Create LambdaTest cloud session with full options
    const session = await client.sessions.create({
        // LambdaTest Configuration
        lambdatestOptions: {
            build: 'Full API Demo',
            name: 'Complete Feature Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                resolution: '1920x1080',
                video: true,
                console: true,
                network: true,
                visual: true
            }
        },
        // Session options
        dimensions: { width: 1920, height: 1080 },
        timeout: 600000,
        // Stealth configuration
        stealthConfig: {
            humanizeInteractions: true,
            skipFingerprintInjection: false
        },
        // Profile persistence
        profileId: 'full_demo_profile',
        persistProfile: true,
        // Captcha solving
        solveCaptcha: true,
        // Bandwidth optimization
        optimizeBandwidth: {
            blockImages: false,
            blockMedia: true
        }
    });

    console.log(`   ✓ Session created: ${session.id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Platform: ${session.config.lambdatestOptions?.platformName}`);
    console.log(`   View at: https://automation.lambdatest.com/`);

    // List all sessions
    const allSessions = client.sessions.list();
    console.log(`   ✓ Active sessions: ${allSessions.length}`);

    // Retrieve specific session
    const retrieved = client.sessions.retrieve(session.id);
    console.log(`   ✓ Retrieved: ${retrieved?.id}`);

    // Connect with Puppeteer adapter
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];

    // ========================================
    // 2. COMPUTER ACTIONS - SauceDemo E-commerce
    // ========================================
    console.log("\n\n🔹 2. COMPUTER ACTIONS - E-commerce Automation");
    console.log("─".repeat(50));

    // Navigate to SauceDemo
    console.log("\n🌐 Navigating to SauceDemo...");
    await page.goto('https://www.saucedemo.com', { waitUntil: 'networkidle2' });

    // Screenshot of login page
    const loginScreen = await client.sessions.computer(session.id, page, {
        action: 'screenshot'
    });
    console.log(`   ✓ screenshot: ${loginScreen.base64_image?.length || 0} bytes`);

    // Type username
    const usernameInput = await page.$('#user-name');
    const usernameBox = await usernameInput?.boundingBox();
    if (usernameBox) {
        await client.sessions.computer(session.id, page, {
            action: 'click',
            coordinate: [Math.round(usernameBox.x + usernameBox.width / 2), Math.round(usernameBox.y + usernameBox.height / 2)]
        });
        await client.sessions.computer(session.id, page, {
            action: 'type',
            text: 'standard_user'
        });
        console.log(`   ✓ type: username`);
    }

    // Type password
    const passwordInput = await page.$('#password');
    const passwordBox = await passwordInput?.boundingBox();
    if (passwordBox) {
        await client.sessions.computer(session.id, page, {
            action: 'click',
            coordinate: [Math.round(passwordBox.x + passwordBox.width / 2), Math.round(passwordBox.y + passwordBox.height / 2)]
        });
        await client.sessions.computer(session.id, page, {
            action: 'type',
            text: 'secret_sauce'
        });
        console.log(`   ✓ type: password`);
    }

    // Click login button
    const loginBtn = await page.$('#login-button');
    const loginBox = await loginBtn?.boundingBox();
    if (loginBox) {
        await client.sessions.computer(session.id, page, {
            action: 'click',
            coordinate: [Math.round(loginBox.x + loginBox.width / 2), Math.round(loginBox.y + loginBox.height / 2)]
        });
        console.log(`   ✓ click: login button`);
    }

    // Wait for inventory
    await page.waitForSelector('.inventory_list', { timeout: 10000 });
    console.log(`   ✓ Logged in successfully!`);

    // Scroll through products
    await client.sessions.computer(session.id, page, {
        action: 'scroll',
        deltaY: 300
    });
    console.log(`   ✓ scroll: 300px down`);

    // Add item to cart
    const addButton = await page.$('[data-test="add-to-cart-sauce-labs-backpack"]');
    const addBox = await addButton?.boundingBox();
    if (addBox) {
        await client.sessions.computer(session.id, page, {
            action: 'click',
            coordinate: [Math.round(addBox.x + addBox.width / 2), Math.round(addBox.y + addBox.height / 2)]
        });
        console.log(`   ✓ click: Add to cart`);
    }

    // ========================================
    // 3. SESSION CONTEXT
    // ========================================
    console.log("\n\n🔹 3. SESSION CONTEXT");
    console.log("─".repeat(50));

    const context = await client.sessions.context(session.id, page);
    console.log(`   ✓ Cookies: ${context.cookies?.length || 0}`);
    context.cookies?.slice(0, 2).forEach(c => console.log(`     - ${c.name}`));
    console.log(`   ✓ LocalStorage origins: ${Object.keys(context.localStorage || {}).length}`);

    // ========================================
    // 4. SESSION EVENTS
    // ========================================
    console.log("\n\n🔹 4. SESSION EVENTS (Recording)");
    console.log("─".repeat(50));

    const events = client.sessions.events(session.id);
    console.log(`   ✓ Recorded events: ${events.length}`);

    // ========================================
    // 5. LIVE DETAILS
    // ========================================
    console.log("\n\n🔹 5. LIVE DETAILS");
    console.log("─".repeat(50));

    const liveDetails = await client.sessions.liveDetails(session.id);
    console.log(`   ✓ Open pages: ${liveDetails?.pages.length || 0}`);

    // ========================================
    // 6. QUICK ACTIONS - DuckDuckGo
    // ========================================
    console.log("\n\n🔹 6. QUICK ACTIONS - DuckDuckGo");
    console.log("─".repeat(50));

    const scrapeResult = await client.scrape({
        url: 'https://duckduckgo.com',
        format: 'text',
        delay: 1000
    });
    console.log(`   ✓ scrape(): "${scrapeResult.title}"`);

    const screenshotResult = await client.screenshot({
        url: 'https://httpbin.org',
        fullPage: false
    });
    console.log(`   ✓ screenshot(): ${'data' in screenshotResult ? screenshotResult.data.length : 'N/A'} bytes`);

    const pdfResult = await client.pdf({
        url: 'https://httpbin.org',
        format: 'A4'
    });
    console.log(`   ✓ pdf(): ${'data' in pdfResult ? pdfResult.data.length : 'N/A'} bytes`);

    // ========================================
    // 7. FILES (Session-scoped)
    // ========================================
    console.log("\n\n🔹 7. FILES MANAGEMENT");
    console.log("─".repeat(50));

    const fileContent = Buffer.from(`Session ${session.id} test file - ${new Date().toISOString()}`);
    await client.sessions.files.upload(session.id, fileContent, 'test.txt');
    console.log(`   ✓ upload(): test.txt`);

    const files = await client.sessions.files.list(session.id);
    console.log(`   ✓ list(): ${files.length} file(s)`);

    await client.sessions.files.deleteAll(session.id);
    console.log(`   ✓ deleteAll(): cleaned`);

    // ========================================
    // 8. EXTENSIONS
    // ========================================
    console.log("\n\n🔹 8. EXTENSIONS MANAGEMENT");
    console.log("─".repeat(50));

    const extensions = await client.extensions.list();
    console.log(`   ✓ list(): ${extensions.length} extension(s)`);

    const extPaths = await client.extensions.getEnabledExtensionPaths();
    console.log(`   ✓ getEnabledExtensionPaths(): ${extPaths.length} path(s)`);

    // ========================================
    // 9. CREDENTIALS
    // ========================================
    console.log("\n\n🔹 9. CREDENTIALS MANAGEMENT");
    console.log("─".repeat(50));

    const cred = await client.credentials.create({
        url: 'https://www.saucedemo.com',
        username: 'standard_user',
        password: 'secret_sauce'
    });
    console.log(`   ✓ create(): ${cred.id}`);

    const allCreds = await client.credentials.list();
    console.log(`   ✓ list(): ${allCreds.length} credential(s)`);

    const found = await client.credentials.findForUrl('https://www.saucedemo.com');
    console.log(`   ✓ findForUrl(): ${found ? 'Found' : 'Not found'}`);

    await client.credentials.delete(cred.id);
    console.log(`   ✓ delete(): cleaned`);

    // ========================================
    // 10. PROFILES
    // ========================================
    console.log("\n\n🔹 10. PROFILE MANAGEMENT");
    console.log("─".repeat(50));

    const profile = await client.profiles.create('demo_profile');
    console.log(`   ✓ create(): ${profile.id}`);

    const profiles = await client.profiles.list();
    console.log(`   ✓ list(): ${profiles.length} profile(s)`);

    await client.profiles.saveProfile('saucedemo_session', page);
    console.log(`   ✓ saveProfile(): saved from current page`);

    // ========================================
    // 11. CAPTCHA
    // ========================================
    console.log("\n\n🔹 11. CAPTCHA INTEGRATION");
    console.log("─".repeat(50));

    const captchaJob = await client.sessions.captchas.solveImage(session.id, {
        type: 'image',
        pageUrl: page.url()
    });
    console.log(`   ✓ solveImage(): ${captchaJob.id}`);

    await new Promise(r => setTimeout(r, 100));
    const captchaStatus = await client.sessions.captchas.status(session.id);
    console.log(`   ✓ status(): ${captchaStatus.status}`);

    // ========================================
    // 12. SESSION CLEANUP
    // ========================================
    console.log("\n\n🔹 12. SESSION CLEANUP");
    console.log("─".repeat(50));

    await browser.close();

    // Release single session
    const releaseResult = await client.sessions.release(session.id);
    console.log(`   ✓ release(): ${releaseResult.message}`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n\n" + "═".repeat(60));
    console.log("  ✅ Full API Demo Complete!");
    console.log("  View recording at: https://automation.lambdatest.com/");
    console.log("═".repeat(60));

    console.log("\n📚 Available APIs:");
    console.log("─".repeat(50));
    console.log("Sessions:");
    console.log("   sessions.{create, list, retrieve, release, releaseAll}");
    console.log("   sessions.{computer, context, events, liveDetails}");
    console.log("   sessions.files.{list, upload, download, delete, deleteAll}");
    console.log("   sessions.captchas.{solveImage, status}");
    console.log("\nQuick Actions:");
    console.log("   client.{scrape, screenshot, pdf}");
    console.log("\nServices:");
    console.log("   client.files.{upload, list, download, delete}");
    console.log("   client.extensions.{upload, list, update, delete}");
    console.log("   client.credentials.{create, list, findForUrl, delete}");
    console.log("   client.profiles.{create, list, loadProfile, saveProfile}");
    console.log("\nAdapters:");
    console.log("   client.{puppeteer, playwright, selenium}.connect(session)");
}

main().catch(console.error);
