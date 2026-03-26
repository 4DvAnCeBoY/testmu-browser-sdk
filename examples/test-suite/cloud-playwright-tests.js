// CLOUD TEST SUITE: Playwright scenarios on LambdaTest
const { chromium } = require('playwright-core');

const tests = [];
let browser, page;

async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    tests.push({ name, status: 'FAIL', error: err.message.substring(0, 120) });
    console.log(`  ✗ ${name}: ${err.message.substring(0, 80)}`);
  }
}

(async () => {
  console.log('\n=== CLOUD PLAYWRIGHT TEST SUITE ===\n');

  browser = await chromium.launch();
  const context = await browser.newContext();
  page = await context.newPage();

  // --- Navigation & Content ---
  console.log('--- Navigation & Content ---');

  await test('26. Navigate to SPA (TodoMVC)', async () => {
    await page.goto('https://todomvc.com/examples/react/dist/', { timeout: 30000 });
    const title = await page.title();
    if (!title.includes('TodoMVC')) throw new Error('Wrong title: ' + title);
  });

  await test('27. Add todo items', async () => {
    const input = await page.$('.new-todo');
    await input.fill('Test item 1');
    await page.keyboard.press('Enter');
    await input.fill('Test item 2');
    await page.keyboard.press('Enter');
    await input.fill('Test item 3');
    await page.keyboard.press('Enter');
    const count = await page.$$eval('.todo-list li', els => els.length);
    if (count !== 3) throw new Error('Expected 3 todos, got ' + count);
  });

  await test('28. Check/uncheck todo', async () => {
    await page.click('.todo-list li:first-child .toggle');
    const completed = await page.$eval('.todo-list li:first-child', el => el.classList.contains('completed'));
    if (!completed) throw new Error('Item not marked completed');
    await page.click('.todo-list li:first-child .toggle');
  });

  await test('29. Filter todos (Active/Completed)', async () => {
    await page.click('.todo-list li:first-child .toggle');
    await page.click('a[href="#/active"]');
    const active = await page.$$eval('.todo-list li', els => els.length);
    await page.click('a[href="#/completed"]');
    const completed = await page.$$eval('.todo-list li', els => els.length);
    await page.click('a[href="#/"]');
    if (active + completed !== 3) throw new Error(`Active ${active} + completed ${completed} != 3`);
  });

  await test('30. Delete todo item', async () => {
    await page.hover('.todo-list li:last-child');
    await page.click('.todo-list li:last-child .destroy');
    const count = await page.$$eval('.todo-list li', els => els.length);
    if (count !== 2) throw new Error('Expected 2 todos after delete, got ' + count);
  });

  // --- Form Interactions ---
  console.log('\n--- Form Interactions ---');

  await test('31. Login form (Sauce Demo)', async () => {
    await page.goto('https://www.saucedemo.com/', { timeout: 30000 });
    await page.fill('#user-name', 'standard_user');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    await page.waitForURL('**/inventory.html', { timeout: 10000 });
  });

  await test('32. Add to cart and verify badge', async () => {
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    const badge = await page.$eval('.shopping_cart_badge', el => el.textContent);
    if (badge !== '1') throw new Error('Badge not 1: ' + badge);
  });

  await test('33. Remove from cart', async () => {
    await page.click('[data-test="remove-sauce-labs-backpack"]');
    const badge = await page.$('.shopping_cart_badge');
    if (badge) throw new Error('Badge should be gone');
  });

  await test('34. Sort products by price', async () => {
    await page.selectOption('[data-test="product-sort-container"]', 'lohi');
    const prices = await page.$$eval('.inventory_item_price', els => els.map(el => parseFloat(el.textContent.replace('$', ''))));
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) throw new Error('Not sorted by price');
    }
  });

  await test('35. Hamburger menu navigation', async () => {
    await page.click('#react-burger-menu-btn');
    await page.waitForSelector('.bm-menu', { timeout: 3000 });
    await page.click('#about_sidebar_link');
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes('saucelabs.com')) throw new Error('Did not navigate to about: ' + url);
  });

  // --- Dynamic Content ---
  console.log('\n--- Dynamic Content ---');

  await test('36. Wait for dynamic content', async () => {
    await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1', { timeout: 30000 });
    await page.click('#start button');
    await page.waitForSelector('#finish', { timeout: 10000 });
    const text = await page.$eval('#finish h4', el => el.textContent);
    if (!text.includes('Hello World')) throw new Error('Wrong text: ' + text);
  });

  await test('37. Dropdown selection', async () => {
    await page.goto('https://the-internet.herokuapp.com/dropdown', { timeout: 30000 });
    await page.selectOption('#dropdown', '2');
    const value = await page.$eval('#dropdown', el => el.value);
    if (value !== '2') throw new Error('Dropdown not set to 2');
  });

  await test('38. Checkboxes interaction', async () => {
    await page.goto('https://the-internet.herokuapp.com/checkboxes', { timeout: 30000 });
    const checkboxes = await page.$$('#checkboxes input');
    await checkboxes[0].check();
    await checkboxes[1].uncheck();
    const c1 = await checkboxes[0].isChecked();
    const c2 = await checkboxes[1].isChecked();
    if (!c1 || c2) throw new Error(`Checkboxes wrong: ${c1}, ${c2}`);
  });

  await test('39. Hover to reveal hidden element', async () => {
    await page.goto('https://the-internet.herokuapp.com/hovers', { timeout: 30000 });
    await page.hover('.figure:first-child img');
    const visible = await page.isVisible('.figure:first-child .figcaption');
    if (!visible) throw new Error('Hover caption not visible');
  });

  await test('40. Key press detection', async () => {
    await page.goto('https://the-internet.herokuapp.com/key_presses', { timeout: 30000 });
    await page.press('#target', 'a');
    const result = await page.$eval('#result', el => el.textContent);
    if (!result.includes('A')) throw new Error('Key press not detected: ' + result);
  });

  // --- Data Extraction ---
  console.log('\n--- Data Extraction ---');

  await test('41. Extract table data', async () => {
    await page.goto('https://the-internet.herokuapp.com/tables', { timeout: 30000 });
    const rows = await page.$$eval('#table1 tbody tr', trs =>
      trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent))
    );
    if (rows.length < 3) throw new Error('Expected 3+ rows, got ' + rows.length);
  });

  await test('42. Extract links from page', async () => {
    await page.goto('https://the-internet.herokuapp.com', { timeout: 30000 });
    const links = await page.$$eval('#content ul li a', as => as.map(a => ({ text: a.textContent, href: a.href })));
    if (links.length < 20) throw new Error('Expected 20+ links, got ' + links.length);
  });

  await test('43. Screenshot viewport capture', async () => {
    await page.goto('https://www.saucedemo.com/inventory.html', { timeout: 30000 });
    const buffer = await page.screenshot({ fullPage: false });
    if (buffer.length < 1000) throw new Error('Screenshot too small: ' + buffer.length);
  });

  await test('44. Evaluate complex JS in page', async () => {
    await page.goto('https://www.wikipedia.org', { timeout: 30000 });
    const data = await page.evaluate(() => ({
      languages: document.querySelectorAll('.central-featured-lang').length,
      searchExists: !!document.querySelector('#searchInput'),
      title: document.title,
    }));
    if (!data.searchExists) throw new Error('Search not found');
  });

  await test('45. Multiple page navigation', async () => {
    await page.goto('https://the-internet.herokuapp.com', { timeout: 30000 });
    await page.click('a[href="/login"]');
    await page.waitForURL('**/login');
    await page.goBack();
    await page.waitForURL('**/the-internet.herokuapp.com');
    await page.click('a[href="/tables"]');
    await page.waitForURL('**/tables');
    const title = await page.title();
    if (!title) throw new Error('Navigation failed');
  });

  await browser.close();

  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${tests.length} ===\n`);
  console.log(JSON.stringify({ total: tests.length, passed, failed, tests }, null, 2));
})();
