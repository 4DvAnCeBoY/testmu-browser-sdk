/**
 * SauceDemo Login & Cart Test
 *
 * Tests: Login with standard_user, add item to cart, verify cart contents.
 *
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 *
 * Run:
 *   testmu-browser-cloud run examples/saucedemo-login-cart.ts --adapter playwright
 */

import { testMuBrowser } from '../dist/testMuBrowser';

async function main() {
    const client = new testMuBrowser();

    // Create cloud session
    console.log('Creating TestMu Cloud session...');
    const session = await client.sessions.create({
        adapter: 'playwright',
        stealth: true,
        lambdatestOptions: {
            build: 'SauceDemo Login Cart Test',
            name: 'Login + Add to Cart',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: process.env.LT_USERNAME,
                accessKey: process.env.LT_ACCESS_KEY,
                resolution: '1920x1080',
                video: true,
                console: true,
                network: true,
            },
        },
        dimensions: { width: 1920, height: 1080 },
    });

    console.log(`Session: ${session.id}`);
    const { browser, page } = await client.playwright.connect(session);
    console.log('Connected to cloud browser');

    try {
        // 1. Navigate to SauceDemo
        await page.goto('https://www.saucedemo.com', { waitUntil: 'networkidle' });
        console.log('1. Loaded login page');

        // 2. Login
        await page.fill('#user-name', 'standard_user');
        await page.fill('#password', 'secret_sauce');
        await page.click('#login-button');
        await page.waitForSelector('.inventory_list');
        console.log('2. Logged in successfully');

        // 3. Add Sauce Labs Backpack to cart
        await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
        console.log('3. Added Sauce Labs Backpack to cart');

        // 4. Navigate to cart
        await page.click('.shopping_cart_link');
        await page.waitForSelector('.cart_list');
        console.log('4. Opened cart');

        // 5. Verify cart contents
        const cartItems = await page.locator('.cart_item').count();
        const itemName = await page.locator('.inventory_item_name').textContent();
        const cartBadge = await page.locator('.shopping_cart_badge').textContent();

        console.log(`5. Cart verification:`);
        console.log(`   Items in cart: ${cartItems}`);
        console.log(`   Item name: ${itemName}`);
        console.log(`   Cart badge: ${cartBadge}`);

        // Assertions
        const passed = cartItems === 1 && itemName === 'Sauce Labs Backpack' && cartBadge === '1';

        if (passed) {
            console.log('\nRESULT: PASS — Login and cart verified');
        } else {
            console.error('\nRESULT: FAIL — Cart verification mismatch');
            process.exitCode = 1;
        }

        // Screenshot for evidence
        await page.screenshot({ fullPage: true });
        console.log('Screenshot captured');
    } finally {
        await browser.close();
        await client.sessions.release(session.id);
        console.log('Session released');
    }
}

main().catch((err) => {
    console.error('Test failed:', err.message);
    process.exitCode = 1;
});
