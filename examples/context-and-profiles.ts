/**
 * Session Context & Profile Management - Real Website Automation
 * 
 * Demonstrates session context and profile management with real e-commerce
 * and social websites for maintaining authenticated state.
 * 
 * Real Websites Used:
 * - https://the-internet.herokuapp.com/login (Login form)
 * - https://www.saucedemo.com (E-commerce demo)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/context-and-profiles.ts
 */

import { testMuBrowser, SessionContext } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

async function main() {
    console.log("🔐 Session Context & Profile Management - Real Websites\n");
    console.log("═".repeat(60));

    const client = new testMuBrowser();

    // ========================================
    // Part 1: Login to Real Website & Extract Context
    // ========================================
    console.log("\n📝 Part 1: Login to Sauce Demo (E-commerce)");
    console.log("─".repeat(50));

    const session1 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Context Management Demo',
            name: 'Session 1 - Login',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        },
        dimensions: { width: 1280, height: 720 }
    });

    console.log(`   Session ID: ${session1.id}`);
    const browser1 = await client.puppeteer.connect(session1);
    const page1 = (await browser1.pages())[0];

    // Navigate to Sauce Demo login page
    console.log("\n🌐 Navigating to Sauce Demo...");
    await page1.goto('https://www.saucedemo.com', { waitUntil: 'networkidle2' });
    console.log("   ✓ Sauce Demo loaded");

    // Perform login with test credentials
    console.log("\n🔑 Logging in with test credentials...");
    await page1.type('#user-name', 'standard_user');
    await page1.type('#password', 'secret_sauce');
    await page1.click('#login-button');

    // Wait for inventory page
    await page1.waitForSelector('.inventory_list', { timeout: 10000 });
    console.log("   ✓ Login successful - Inventory page loaded");

    // Add item to cart (simulate user activity)
    console.log("\n🛒 Adding item to cart...");
    await page1.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    console.log("   ✓ Added Sauce Labs Backpack to cart");

    // Set some localStorage data (user preferences)
    await page1.evaluate(() => {
        localStorage.setItem('userPreferences', JSON.stringify({
            theme: 'dark',
            currency: 'USD',
            lastVisit: new Date().toISOString()
        }));
        localStorage.setItem('cartSaved', 'true');
    });
    console.log("   ✓ Set user preferences in localStorage");

    // ========================================
    // Extract Full Session Context
    // ========================================
    console.log("\n🍪 Extracting session context...");

    const context = await client.sessions.context(session1.id, page1);

    console.log(`   Cookies found: ${context.cookies?.length || 0}`);
    context.cookies?.slice(0, 3).forEach(c => {
        console.log(`     - ${c.name}: ${c.value.substring(0, 30)}...`);
    });

    console.log(`   LocalStorage origins: ${Object.keys(context.localStorage || {}).length}`);
    for (const [origin, data] of Object.entries(context.localStorage || {})) {
        console.log(`     ${origin}: ${Object.keys(data).length} items`);
    }

    // ========================================
    // Save as Profile
    // ========================================
    console.log("\n💾 Saving session as profile...");

    const profileResult = await client.profiles.createFromSession(session1.id, page1);
    console.log(`   Profile created: ${profileResult.id}`);
    console.log(`   Status: ${profileResult.status}`);

    // Take screenshot before closing
    await client.sessions.computer(session1.id, page1, { action: 'screenshot' });

    // Close first session
    await browser1.close();
    await client.sessions.release(session1.id);
    console.log("\n   ✓ Session 1 closed");

    // ========================================
    // Part 2: Heroku Login App Demo
    // ========================================
    console.log("\n\n📝 Part 2: Heroku Login App");
    console.log("─".repeat(50));

    const session2 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Context Management Demo',
            name: 'Session 2 - Heroku Login',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        },
        dimensions: { width: 1280, height: 720 }
    });

    const browser2 = await client.puppeteer.connect(session2);
    const page2 = (await browser2.pages())[0];

    // Navigate to Heroku login app
    console.log("\n🌐 Navigating to Heroku Test App...");
    await page2.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle2' });
    console.log("   ✓ Login page loaded");

    // Login with test credentials
    console.log("\n🔑 Logging in...");
    await page2.type('#username', 'tomsmith');
    await page2.type('#password', 'SuperSecretPassword!');
    await page2.click('button[type="submit"]');

    // Wait for success
    await page2.waitForSelector('.flash.success', { timeout: 10000 });
    console.log("   ✓ Login successful!");

    // Extract context after login
    const herokuContext = await client.sessions.context(session2.id, page2);
    console.log(`\n🍪 Heroku session context:`);
    console.log(`   Cookies: ${herokuContext.cookies?.length || 0}`);

    await browser2.close();
    await client.sessions.release(session2.id);

    // ========================================
    // Part 3: Resume Session with Pre-loaded Context
    // ========================================
    console.log("\n\n📝 Part 3: Resume with Pre-loaded Context");
    console.log("─".repeat(50));

    const session3 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Context Management Demo',
            name: 'Session 3 - Context Restored',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        },
        // Inject saved context
        sessionContext: {
            cookies: context.cookies,
            localStorage: context.localStorage
        }
    });

    const browser3 = await client.puppeteer.connect(session3);
    const page3 = (await browser3.pages())[0];

    // Navigate back to Sauce Demo
    console.log("\n🌐 Navigating to Sauce Demo with restored context...");
    await page3.goto('https://www.saucedemo.com/inventory.html', { waitUntil: 'networkidle2' });

    // Check if we're still logged in
    const isLoggedIn = await page3.$('.inventory_list');
    if (isLoggedIn) {
        console.log("   ✓ Session restored - Still logged in!");

        // Check cart
        const cartBadge = await page3.$('.shopping_cart_badge');
        if (cartBadge) {
            const cartCount = await page3.evaluate(el => el?.textContent, cartBadge);
            console.log(`   ✓ Cart items preserved: ${cartCount}`);
        }
    } else {
        console.log("   Note: Login required (context may have expired)");
    }

    // Verify localStorage was restored
    const restoredPrefs = await page3.evaluate(() => {
        return localStorage.getItem('userPreferences');
    });
    if (restoredPrefs) {
        console.log("   ✓ User preferences restored from localStorage");
    }

    // ========================================
    // Part 4: Profile Management
    // ========================================
    console.log("\n\n📝 Part 4: Profile Management");
    console.log("─".repeat(50));

    // List all profiles
    const profiles = await client.profiles.list();
    console.log(`   Available profiles: ${profiles.length}`);
    profiles.forEach(p => console.log(`     - ${p}`));

    // Get profile details
    const profileData = await client.profiles.getProfile(profileResult.id);
    if (profileData) {
        console.log(`\n   Profile "${profileResult.id}":`);
        console.log(`     Cookies: ${profileData.cookies.length}`);
        console.log(`     LocalStorage items: ${Object.keys(profileData.localStorage).length}`);
    }

    // ========================================
    // Cleanup
    // ========================================
    console.log("\n🧹 Cleaning up...");
    await browser3.close();
    await client.sessions.release(session3.id);

    console.log("\n" + "═".repeat(60));
    console.log("✅ Context & Profile Demo Complete!");
    console.log("   View recordings at: https://automation.lambdatest.com/");
}

main().catch(console.error);
