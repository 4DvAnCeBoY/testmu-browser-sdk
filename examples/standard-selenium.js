// Standard Selenium script — NO @testmuai/browser-cloud SDK
// Developer's existing test they want to run on LambdaTest
const { Builder, By, until } = require('selenium-webdriver');

(async () => {
  const driver = await new Builder().forBrowser('chrome').build();

  await driver.get('https://www.google.com');
  const title = await driver.getTitle();

  // Search for something
  const searchBox = await driver.findElement(By.name('q'));
  await searchBox.sendKeys('TestMu AI browser cloud\n');

  await driver.wait(until.titleContains('TestMu'), 10000).catch(() => {});
  const resultsTitle = await driver.getTitle();
  const url = await driver.getCurrentUrl();

  console.log(JSON.stringify({
    initialTitle: title,
    searchResults: resultsTitle,
    url,
  }, null, 2));

  await driver.quit();
})();
