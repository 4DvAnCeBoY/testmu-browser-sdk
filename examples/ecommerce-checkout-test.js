// Use Case: QA engineer wants to test an e-commerce checkout flow
// Standard Playwright — no SDK needed
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Test Sauce Demo (a real test e-commerce site)
  await page.goto('https://www.saucedemo.com/', { timeout: 30000 });
  console.log('1. Loaded login page:', await page.title());

  // Login
  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  await page.click('#login-button');
  await page.waitForURL('**/inventory.html', { timeout: 10000 });
  console.log('2. Logged in, on inventory page');

  // Add items to cart
  await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
  await page.click('[data-test="add-to-cart-sauce-labs-bike-light"]');
  const cartBadge = await page.$eval('.shopping_cart_badge', el => el.textContent);
  console.log('3. Added 2 items, cart badge:', cartBadge);

  // Go to cart
  await page.click('.shopping_cart_link');
  await page.waitForURL('**/cart.html');
  const cartItems = await page.$$eval('.cart_item', items => items.length);
  console.log('4. Cart page, items:', cartItems);

  // Checkout
  await page.click('[data-test="checkout"]');
  await page.fill('[data-test="firstName"]', 'Test');
  await page.fill('[data-test="lastName"]', 'User');
  await page.fill('[data-test="postalCode"]', '10001');
  await page.click('[data-test="continue"]');
  console.log('5. Checkout info filled');

  // Verify summary
  const total = await page.$eval('.summary_total_label', el => el.textContent);
  console.log('6. Order total:', total);

  // Complete purchase
  await page.click('[data-test="finish"]');
  const confirmation = await page.$eval('.complete-header', el => el.textContent);
  console.log('7. Order confirmed:', confirmation);

  // Screenshot the confirmation
  await page.screenshot({ path: '/tmp/checkout-complete.png' });

  const results = {
    loginSuccess: true,
    itemsInCart: cartItems,
    orderTotal: total,
    confirmation,
    status: confirmation.includes('Thank you') ? 'PASS' : 'FAIL',
  };

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
