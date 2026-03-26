// Standard Puppeteer script — NO @testmuai/browser-cloud SDK
// This is what a developer would already have in their project
const puppeteer = require('puppeteer-core');

(async () => {
  // puppeteer.launch() will be patched by testmu-browser-cloud to connect to LambdaTest
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle2', timeout: 30000 });
  const title = await page.title();

  const stories = await page.evaluate(() => {
    const items = document.querySelectorAll('.titleline > a');
    return Array.from(items).slice(0, 3).map(a => ({
      title: a.textContent,
      url: a.href
    }));
  });

  console.log(JSON.stringify({ title, stories }, null, 2));
  await browser.close();
})();
