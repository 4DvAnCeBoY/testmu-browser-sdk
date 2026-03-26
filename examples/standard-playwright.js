// Standard Playwright script — NO @testmuai/browser-cloud SDK
// Developer's existing test they want to run on LambdaTest
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://www.npmjs.com/package/@testmuai/browser-cloud', { timeout: 30000 });
  const title = await page.title();

  const description = await page.$eval('p[class*="package-description"]', el => el.textContent).catch(() => 'not found');
  const version = await page.$eval('[class*="version"]', el => el.textContent).catch(() => 'not found');

  console.log(JSON.stringify({
    title,
    description,
    version,
    url: page.url()
  }, null, 2));

  await browser.close();
})();
