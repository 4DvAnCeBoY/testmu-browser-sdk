// CLOUD TEST SUITE: Puppeteer scenarios on LambdaTest
const puppeteer = require('puppeteer-core');

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
  console.log('\n=== CLOUD PUPPETEER TEST SUITE ===\n');

  browser = await puppeteer.launch();
  page = await browser.newPage();

  // --- Web Scraping Scenarios ---
  console.log('--- Web Scraping ---');

  await test('46. Scrape structured data from Wikipedia', async () => {
    await page.goto('https://en.wikipedia.org/wiki/Node.js', { waitUntil: 'networkidle2', timeout: 30000 });
    const infobox = await page.evaluate(() => {
      const rows = document.querySelectorAll('.infobox tr');
      const data = {};
      rows.forEach(r => {
        const th = r.querySelector('th');
        const td = r.querySelector('td');
        if (th && td) data[th.textContent.trim()] = td.textContent.trim().substring(0, 50);
      });
      return data;
    });
    if (!infobox['Developer(s)'] && !infobox['Original author(s)']) throw new Error('No infobox data');
  });

  await test('47. Scrape multiple pages sequentially', async () => {
    const urls = [
      'https://httpbin.org/html',
      'https://httpbin.org/json',
      'https://httpbin.org/xml',
    ];
    const titles = [];
    for (const url of urls) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      titles.push(await page.title());
    }
    if (titles.length !== 3) throw new Error('Expected 3 pages');
  });

  await test('48. Extract meta tags', async () => {
    await page.goto('https://www.npmjs.com/package/puppeteer', { waitUntil: 'networkidle2', timeout: 30000 });
    const metas = await page.evaluate(() => {
      const tags = {};
      document.querySelectorAll('meta').forEach(m => {
        const name = m.getAttribute('name') || m.getAttribute('property');
        const content = m.getAttribute('content');
        if (name && content) tags[name] = content.substring(0, 80);
      });
      return tags;
    });
    if (Object.keys(metas).length < 3) throw new Error('Too few meta tags: ' + Object.keys(metas).length);
  });

  // --- Browser Capabilities ---
  console.log('\n--- Browser Capabilities ---');

  await test('49. Cookie management', async () => {
    await page.goto('https://httpbin.org/cookies/set?testcookie=hello123', { waitUntil: 'networkidle2', timeout: 20000 });
    const cookies = await page.cookies();
    const found = cookies.find(c => c.name === 'testcookie');
    if (!found || found.value !== 'hello123') throw new Error('Cookie not set');
  });

  await test('50. Set and read localStorage', async () => {
    await page.goto('https://the-internet.herokuapp.com', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.evaluate(() => {
      localStorage.setItem('testKey', 'testValue123');
    });
    const value = await page.evaluate(() => localStorage.getItem('testKey'));
    if (value !== 'testValue123') throw new Error('localStorage not set');
  });

  await test('51. Intercept and check console logs', async () => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.evaluate(() => {
      console.log('TestMu Cloud test log');
      console.warn('TestMu warning');
    });
    if (!logs.some(l => l.includes('TestMu Cloud'))) throw new Error('Console log not captured');
  });

  await test('52. User agent string check', async () => {
    await page.goto('https://httpbin.org/user-agent', { waitUntil: 'networkidle2', timeout: 20000 });
    const body = await page.$eval('body', el => el.textContent);
    const parsed = JSON.parse(body);
    if (!parsed['user-agent']) throw new Error('No user-agent');
  });

  await test('53. Viewport resize', async () => {
    await page.setViewport({ width: 1440, height: 900 });
    const size = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    if (size.w !== 1440) throw new Error('Width not 1440: ' + size.w);
    await page.setViewport({ width: 1920, height: 1080 });
  });

  // --- Advanced Interactions ---
  console.log('\n--- Advanced Interactions ---');

  await test('54. Type with delay (simulated human)', async () => {
    await page.goto('https://the-internet.herokuapp.com/inputs', { waitUntil: 'networkidle2', timeout: 20000 });
    const input = await page.$('input[type="number"]');
    await input.click();
    await page.keyboard.type('12345', { delay: 50 });
    const value = await page.evaluate(el => el.value, input);
    if (value !== '12345') throw new Error('Typed value wrong: ' + value);
  });

  await test('55. Right-click context menu', async () => {
    await page.goto('https://the-internet.herokuapp.com/context_menu', { waitUntil: 'networkidle2', timeout: 20000 });
    // Dismiss any dialog that may appear
    page.once('dialog', async dialog => { await dialog.accept(); });
    await page.click('#hot-spot', { button: 'right' });
    // If no error, the right-click worked
  });

  await test('56. Scroll to bottom of page', async () => {
    await page.goto('https://the-internet.herokuapp.com', { waitUntil: 'networkidle2', timeout: 20000 });
    const beforeY = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const afterY = await page.evaluate(() => window.scrollY);
    if (afterY <= beforeY) throw new Error('Did not scroll');
  });

  await test('57. Take full-page screenshot', async () => {
    await page.goto('https://the-internet.herokuapp.com', { waitUntil: 'networkidle2', timeout: 20000 });
    const buf = await page.screenshot({ fullPage: true, encoding: 'binary' });
    if (buf.length < 5000) throw new Error('Screenshot too small');
  });

  await test('58. HTTP status code check', async () => {
    const response = await page.goto('https://httpbin.org/status/200', { waitUntil: 'networkidle2', timeout: 20000 });
    if (response.status() !== 200) throw new Error('Status not 200: ' + response.status());
  });

  await test('59. 404 page detection', async () => {
    const response = await page.goto('https://httpbin.org/status/404', { waitUntil: 'networkidle2', timeout: 20000 });
    if (response.status() !== 404) throw new Error('Status not 404: ' + response.status());
  });

  await test('60. Redirect following', async () => {
    const response = await page.goto('https://httpbin.org/redirect/1', { waitUntil: 'networkidle2', timeout: 20000 });
    const url = page.url();
    if (!url.includes('httpbin.org/get')) throw new Error('Did not redirect: ' + url);
  });

  await browser.close();

  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${tests.length} ===\n`);
  console.log(JSON.stringify({ total: tests.length, passed, failed, tests }, null, 2));
})();
