// Use Case: Developer wants to test form validation on their webapp
// Standard Puppeteer — no SDK needed
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Test with a real form — The Internet (Heroku test app)
  await page.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('1. Loaded login page:', await page.title());

  // Test invalid login
  await page.type('#username', 'invalid_user');
  await page.type('#password', 'wrong_pass');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#flash', { timeout: 5000 });
  const errorMsg = await page.$eval('#flash', el => el.textContent.trim());
  console.log('2. Invalid login error:', errorMsg.substring(0, 50));

  // Test valid login
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.type('#username', 'tomsmith');
  await page.type('#password', 'SuperSecretPassword!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#flash.success', { timeout: 5000 });
  const successMsg = await page.$eval('#flash', el => el.textContent.trim());
  console.log('3. Valid login success:', successMsg.substring(0, 50));

  // Test logout
  await page.click('a[href="/logout"]');
  await page.waitForSelector('#flash', { timeout: 5000 });
  console.log('4. Logged out');

  const results = {
    invalidLoginShowsError: errorMsg.includes('invalid'),
    validLoginWorks: successMsg.includes('logged into'),
    logoutWorks: true,
    status: errorMsg.includes('invalid') && successMsg.includes('logged into') ? 'PASS' : 'FAIL',
  };

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
