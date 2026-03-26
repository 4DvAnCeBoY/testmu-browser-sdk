/**
 * Steel.dev to testMuBrowser Migration Guide
 * 
 * Complete example showing how to migrate from Steel.dev SDK to testMuBrowser
 * with LambdaTest cloud automation. Demonstrates that the API is compatible.
 * 
 * Real Websites Used:
 * - https://www.saucedemo.com (Authenticated session)
 * - https://the-internet.herokuapp.com/login (Login persistence)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/steel-migration.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

/*
 * MIGRATION GUIDE:
 * 
 * Steel.dev:
 *   import Steel from 'steel-sdk';
 *   const client = new Steel({ steelAPIKey: 'sk_...' });
 * 
 * testMuBrowser:
 *   import { testMuBrowser } from 'testmubrowser';
 *   const client = new testMuBrowser();
 * 
 * The APIs are designed to be compatible!
 */

async function main() {
    console.log("🔄 Steel.dev → testMuBrowser Migration Demo\n");
    console.log("═".repeat(60));
    console.log("  This demo shows Steel-compatible API with LambdaTest cloud");
    console.log("═".repeat(60));

    const client = new testMuBrowser();
    const profileId = "migration_demo_profile";

    // ========================================
    // Session 1: Create and Authenticate
    // ========================================
    console.log(`\n📱 Session 1: Creating session with profile '${profileId}'`);
    console.log("─".repeat(50));

    // Steel-compatible: sessions.create() with profile
    const session1 = await client.sessions.create({
        profileId: profileId,
        stealth: true,
        lambdatestOptions: {
            build: 'Steel Migration Demo',
            name: 'Session 1 - Authentication',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true,
                console: true
            }
        },
        dimensions: { width: 1280, height: 720 },
        timeout: 300000
    });

    console.log(`   Session ID: ${session1.id}`);
    console.log(`   Status: ${session1.status}`);

    // Steel-compatible: Connect via Puppeteer
    const browser1 = await client.puppeteer.connect(session1);
    const page1 = (await browser1.pages())[0];

    // ========================================
    // Authenticate on SauceDemo
    // ========================================
    console.log("\n🔐 Authenticating on SauceDemo...");
    await page1.goto('https://www.saucedemo.com', { waitUntil: 'networkidle2' });

    await page1.type('#user-name', 'standard_user');
    await page1.type('#password', 'secret_sauce');
    await page1.click('#login-button');

    await page1.waitForSelector('.inventory_list');
    console.log("   ✓ Login successful");

    // Add item to cart (create session state)
    await page1.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    console.log("   ✓ Added item to cart");

    // Take screenshot with computer actions (Steel-compatible)
    const authScreenshot = await client.sessions.computer(session1.id, page1, {
        action: 'screenshot'
    });
    console.log(`   ✓ Screenshot: ${authScreenshot.base64_image?.length || 0} bytes`);

    // Get session context (Steel-compatible)
    const context1 = await client.sessions.context(session1.id, page1);
    console.log(`   ✓ Cookies captured: ${context1.cookies?.length || 0}`);

    // Save profile (Steel-compatible: profiles)
    await client.profiles.saveProfile(profileId, page1);
    console.log(`   ✓ Profile saved: ${profileId}`);

    // Close session
    await browser1.close();
    await client.sessions.release(session1.id);
    console.log("\n   Session 1 closed.");

    // ========================================
    // Session 2: Resume with Persisted State
    // ========================================
    console.log(`\n📱 Session 2: Resuming with profile '${profileId}'`);
    console.log("─".repeat(50));

    const session2 = await client.sessions.create({
        profileId: profileId,
        stealth: true,
        lambdatestOptions: {
            build: 'Steel Migration Demo',
            name: 'Session 2 - Verification',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        },
        // Steel-compatible: Pre-load context
        sessionContext: {
            cookies: context1.cookies,
            localStorage: context1.localStorage
        }
    });

    console.log(`   Session ID: ${session2.id}`);

    const browser2 = await client.puppeteer.connect(session2);
    const page2 = (await browser2.pages())[0];

    // Navigate to SauceDemo inventory (should be logged in)
    console.log("\n🔍 Verifying session persistence...");
    await page2.goto('https://www.saucedemo.com/inventory.html', { waitUntil: 'networkidle2' });

    // Check if still authenticated
    const inventoryLoaded = await page2.$('.inventory_list');
    if (inventoryLoaded) {
        console.log("   ✓ Session restored - Still logged in!");

        // Check cart
        const cartBadge = await page2.$('.shopping_cart_badge');
        if (cartBadge) {
            const cartCount = await page2.evaluate(el => el?.textContent, cartBadge);
            console.log(`   ✓ Cart persisted: ${cartCount} item(s)`);
        }
    } else {
        console.log("   Note: Session expired (may need fresh login)");
    }

    // Steel-compatible: Quick actions
    console.log("\n⚡ Using Steel-compatible Quick Actions...");
    const scrapeResult = await client.scrape({
        url: 'https://www.saucedemo.com',
        format: 'text',
        sessionId: session2.id
    });
    console.log(`   ✓ scrape(): ${scrapeResult.title}`);

    // Steel-compatible: Get live session details
    const liveDetails = await client.sessions.liveDetails(session2.id);
    console.log(`   ✓ liveDetails(): ${liveDetails?.pages.length || 0} pages`);

    // Steel-compatible: Get session events
    const events = client.sessions.events(session2.id);
    console.log(`   ✓ events(): ${events.length} recorded`);

    // Close session
    await browser2.close();
    await client.sessions.release(session2.id);

    // ========================================
    // Session 3: Heroku App (Another Real Site)
    // ========================================
    console.log(`\n📱 Session 3: Heroku Login App`);
    console.log("─".repeat(50));

    const session3 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Steel Migration Demo',
            name: 'Session 3 - Heroku',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    const browser3 = await client.puppeteer.connect(session3);
    const page3 = (await browser3.pages())[0];

    console.log("\n🌐 Testing Heroku Login App...");
    await page3.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle2' });

    await page3.type('#username', 'tomsmith');
    await page3.type('#password', 'SuperSecretPassword!');
    await page3.click('button[type="submit"]');

    await page3.waitForSelector('.flash.success');

    const successMessage = await page3.evaluate(() => {
        return document.querySelector('.flash.success')?.textContent?.trim();
    });
    console.log(`   ✓ ${successMessage?.substring(0, 50)}`);

    await browser3.close();
    await client.sessions.release(session3.id);

    // ========================================
    // Summary
    // ========================================
    console.log("\n\n" + "═".repeat(60));
    console.log("✅ Migration Demo Complete!");
    console.log("   View recordings at: https://automation.lambdatest.com/");
    console.log("═".repeat(60));

    console.log("\n📋 Steel.dev → testMuBrowser API Mapping:");
    console.log("─".repeat(50));
    console.log("   Steel                       → testMuBrowser");
    console.log("   ─────                          ─────────────");
    console.log("   new Steel({steelAPIKey})   → new testMuBrowser()");
    console.log("   sessions.create()          → sessions.create()  ✓");
    console.log("   sessions.list()            → sessions.list()    ✓");
    console.log("   sessions.release(id)       → sessions.release() ✓");
    console.log("   sessions.releaseAll()      → sessions.releaseAll() ✓");
    console.log("   sessions.computer()        → sessions.computer() ✓");
    console.log("   sessions.context()         → sessions.context() ✓");
    console.log("   sessions.events()          → sessions.events()  ✓");
    console.log("   scrape()                   → scrape()           ✓");
    console.log("   screenshot()               → screenshot()       ✓");
    console.log("   pdf()                      → pdf()              ✓");
}

main().catch(console.error);
