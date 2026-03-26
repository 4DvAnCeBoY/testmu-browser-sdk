// Use Case: Testing responsive design on mobile viewport
// Standard Puppeteer — no SDK needed
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set mobile viewport
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  await page.goto('https://www.wikipedia.org', { waitUntil: 'networkidle2', timeout: 30000 });
  const title = await page.title();

  // Check if mobile layout is rendered
  const viewport = page.viewport();
  const isMobileLayout = await page.evaluate(() => {
    return window.innerWidth <= 768;
  });

  // Take mobile screenshot
  await page.screenshot({ path: '/tmp/wikipedia-mobile.png', fullPage: false });

  // Search on mobile
  const searchInput = await page.$('#searchInput');
  if (searchInput) {
    await searchInput.type('Artificial Intelligence');
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ timeout: 10000 });
  }

  const searchTitle = await page.title();

  const results = {
    title,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    isMobileLayout,
    searchWorked: searchTitle.includes('Artificial intelligence') || searchTitle.includes('Search'),
    screenshotSaved: '/tmp/wikipedia-mobile.png',
    status: isMobileLayout ? 'PASS' : 'FAIL',
  };

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
