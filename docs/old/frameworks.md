# Multi-Framework Support

`testMuBrowser` is framework-agnostic. You can use your favorite automation library.

## Puppeteer

The Puppeteer adapter includes built-in **Stealth** and **Profile Persistence**.

```typescript
import { testMuBrowser } from 'testMuBrowser';

const client = new testMuBrowser();
const session = await client.sessions.create({ stealth: true });

// Connect
const browser = await client.puppeteer.connect(session); // Returns puppeteer.Browser
const page = await browser.newPage();
// ... usage ...
```

## Playwright

The Playwright adapter supports connection over CDP and **Persistence**.

```typescript
import { testMuBrowser } from 'testMuBrowser';

const client = new testMuBrowser();
const session = await client.sessions.create();

// Connect
const { browser, context, page } = await client.playwright.connect(session);

await page.goto('https://example.com');
```

## Selenium

For Selenium, we provide the connection details needed to initialize your WebDriver.

```typescript
import { testMuBrowser } from 'testMuBrowser';
import { Builder } from 'selenium-webdriver';

const client = new testMuBrowser();
const session = await client.sessions.create();

const { hubUrl, capabilities } = await client.selenium.connect(session);

const driver = new Builder()
    .usingServer(hubUrl)
    .withCapabilities(capabilities)
    .build();
```
