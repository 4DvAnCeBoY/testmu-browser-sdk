/**
 * Playwright Adapter Demo with LambdaTest
 * 
 * Demonstrates using the Playwright adapter with LambdaTest cloud
 * for cross-browser testing automation.
 * 
 * Real Websites Used:
 * - https://demo.playwright.dev/todomvc (TodoMVC app)
 * - https://www.saucedemo.com (E-commerce testing)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/playwright-demo.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

async function main() {
    console.log("🎭 Playwright Adapter Demo with LambdaTest\n");
    console.log("═".repeat(60));

    const client = new testMuBrowser();
    const profileId = "playwright_user_01";

    // ========================================
    // 1. Create LambdaTest Session
    // ========================================
    console.log("\n📱 Creating LambdaTest session for Playwright...");

    const session = await client.sessions.create({
        adapter: 'playwright',  // Use Playwright plugin on LambdaTest
        profileId: profileId,
        stealth: true,
        lambdatestOptions: {
            build: 'Playwright Demo',
            name: 'TodoMVC Automation',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                resolution: '1920x1080',
                video: true,
                console: true,
                network: true
            }
        },
        dimensions: { width: 1920, height: 1080 }
    });

    console.log(`   Session ID: ${session.id}`);
    console.log(`   Status: ${session.status}`);

    // ========================================
    // 2. Connect via Playwright Adapter
    // ========================================
    console.log("\n🔌 Connecting via Playwright adapter...");
    const { browser, page } = await client.playwright.connect(session);
    console.log("   ✓ Connected");

    // ========================================
    // 3. TodoMVC Automation
    // ========================================
    console.log("\n📝 Automating TodoMVC app...");
    await page.goto('https://demo.playwright.dev/todomvc/#/', { waitUntil: 'networkidle' });
    console.log("   ✓ TodoMVC loaded");

    // Add todo items
    const todoInput = page.locator('.new-todo');

    const todos = [
        'Learn testMuBrowser',
        'Integrate with LambdaTest',
        'Build automation tests'
    ];

    for (const todo of todos) {
        await todoInput.fill(todo);
        await todoInput.press('Enter');
        console.log(`   ✓ Added: "${todo}"`);
    }

    // Verify items were added
    const todoCount = await page.locator('.todo-list li').count();
    console.log(`\n   Total todos: ${todoCount}`);

    // Complete first item
    console.log("\n✅ Completing first todo...");
    await page.locator('.todo-list li').first().locator('.toggle').click();

    // Check completed count
    const completedCount = await page.locator('.todo-list li.completed').count();
    console.log(`   Completed: ${completedCount}`);

    // ========================================
    // 4. Sauce Demo - E-commerce Flow
    // ========================================
    console.log("\n\n🛒 E-commerce Automation on Sauce Demo...");
    await page.goto('https://www.saucedemo.com', { waitUntil: 'networkidle' });
    console.log("   ✓ Sauce Demo loaded");

    // Login
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');

    // Wait for inventory
    await page.waitForSelector('.inventory_list');
    console.log("   ✓ Logged in");

    // Add multiple items
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await page.click('[data-test="add-to-cart-sauce-labs-bike-light"]');
    console.log("   ✓ Added 2 items to cart");

    // Go to cart
    await page.click('.shopping_cart_link');
    await page.waitForSelector('.cart_list');

    const cartItems = await page.locator('.cart_item').count();
    console.log(`   ✓ Cart items: ${cartItems}`);

    // Proceed to checkout
    await page.click('[data-test="checkout"]');
    await page.waitForSelector('.checkout_info');
    console.log("   ✓ Proceeded to checkout");

    // Fill checkout info
    await page.fill('[data-test="firstName"]', 'Test');
    await page.fill('[data-test="lastName"]', 'User');
    await page.fill('[data-test="postalCode"]', '12345');
    await page.click('[data-test="continue"]');
    console.log("   ✓ Filled checkout info");

    // Complete order
    await page.waitForSelector('.summary_info');
    const total = await page.locator('.summary_total_label').textContent();
    console.log(`   ✓ Order total: ${total}`);

    await page.click('[data-test="finish"]');
    await page.waitForSelector('.complete-header');

    const confirmation = await page.locator('.complete-header').textContent();
    console.log(`   ✓ ${confirmation}`);

    // ========================================
    // 5. Playwright Context Features
    // ========================================
    console.log("\n\n🍪 Playwright Context Features...");

    // Get cookies using Playwright native API
    const cookies = await page.context().cookies();
    console.log(`   Cookies: ${cookies.length}`);

    // Add a custom cookie
    await page.context().addCookies([{
        name: 'playwright_test',
        value: 'automation_cookie',
        domain: 'www.saucedemo.com',
        path: '/'
    }]);
    console.log("   ✓ Added custom cookie");

    // Take screenshot using Playwright
    const screenshot = await page.screenshot({ fullPage: true });
    console.log(`   ✓ Screenshot: ${screenshot.length} bytes`);

    // ========================================
    // Cleanup
    // ========================================
    console.log("\n🧹 Cleaning up...");
    await browser.close();
    await client.sessions.release(session.id);

    console.log("\n" + "═".repeat(60));
    console.log("✅ Playwright Demo Complete!");
    console.log("   View recording at: https://automation.lambdatest.com/");
}

main().catch(console.error);
