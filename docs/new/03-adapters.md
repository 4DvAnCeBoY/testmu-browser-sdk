# Adapters: Puppeteer, Playwright, and Selenium

testMuBrowser supports Puppeteer, Playwright, and Selenium for browser automation. You choose which one via the `adapter` field in session config. The underlying browser is the same — only the client-side API and connection protocol change.

## Comparison

| Feature | Puppeteer | Playwright | Selenium |
|---------|-----------|------------|----------|
| Connection | WebSocket CDP | WebSocket CDP | HTTP (WebDriver) |
| Stealth Plugin | puppeteer-extra-plugin-stealth | Custom init scripts | Not supported |
| Return Type | `Browser` | `{ browser, context, page }` | `WebDriver` |
| Humanize Methods | `click`, `type` | `click`, `type`, `fill` | N/A |
| Profile Persistence | Cookies | Cookies | Cookies |

## Puppeteer Adapter

### Basic Usage

```typescript
const session = await client.sessions.create({ adapter: 'puppeteer', ... });
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

await page.goto('https://example.com');
await page.screenshot({ path: 'screenshot.png' });

await browser.close();
await client.sessions.release(session.id);
```

### What Happens on Connect

1. Reads `stealthConfig` from the session
2. If `skipFingerprintInjection: true` — uses raw `puppeteer.connect()` (no stealth)
3. Otherwise — uses `puppeteer-extra` with the stealth plugin
4. If stealth is enabled — sets random user-agent and randomized viewport on the page
5. If `humanizeInteractions: true` — monkey-patches `page.click()` and `page.type()` to add random delays
6. If `profileId` is set — loads saved cookies and wraps `browser.close()` to auto-save

### Return Value

```typescript
const browser: Browser = await client.puppeteer.connect(session);
```

Returns a standard Puppeteer `Browser` object. Use it exactly as you would with plain Puppeteer.

## Playwright Adapter

### Basic Usage

```typescript
const session = await client.sessions.create({ adapter: 'playwright', ... });
const { browser, context, page } = await client.playwright.connect(session);

await page.goto('https://example.com');
await page.screenshot({ path: 'screenshot.png' });

await browser.close();
await client.sessions.release(session.id);
```

### What Happens on Connect

1. Connects to LambdaTest cloud via `chromium.connect`
2. Gets or creates a `BrowserContext` and `Page`
3. If stealth is enabled — injects anti-detection scripts via `page.addInitScript()`:
   - Hides `navigator.webdriver`
   - Fakes `chrome.runtime`
   - Fakes `navigator.plugins` (3 standard Chrome plugins)
   - Sets `navigator.languages = ['en-US', 'en']`
   - Patches `permissions.query` for notifications
   - Spoofs WebGL vendor/renderer
4. Applies stealth scripts to future pages via `context.on('page')`
5. If humanize is enabled — patches `page.click()`, `page.type()`, and `page.fill()`
6. If `profileId` is set — loads/saves cookies automatically

### Return Value

```typescript
const { browser, context, page } = await client.playwright.connect(session);
```

Returns a Playwright `Browser`, `BrowserContext`, and `Page`. Use them exactly as you would with plain Playwright.

## Selenium Adapter

### Basic Usage

```typescript
const session = await client.sessions.create({ adapter: 'selenium', ... });
const driver = await client.selenium.connect(session);

await driver.get('https://example.com');
const title = await driver.getTitle();
const screenshot = await driver.takeScreenshot();

await driver.quit();
await client.sessions.release(session.id);
```

### What Happens on Connect

1. Reads `LT_USERNAME` and `LT_ACCESS_KEY` from environment variables
2. Builds W3C capabilities with `LT:Options` from the session config
3. If `userAgent` is set — passes it via `goog:chromeOptions` args (`--user-agent=...`)
4. If `dimensions` is set — passes it via `goog:chromeOptions` args (`--window-size=...`) and `LT:Options.resolution`
5. Connects to LambdaTest Selenium Hub at `https://hub.lambdatest.com/wd/hub` via HTTP (not WebSocket)
6. If `profileId` is set — loads saved cookies and wraps `driver.quit()` to auto-save

### Return Value

```typescript
const driver: WebDriver = await client.selenium.connect(session);
```

Returns a standard Selenium `WebDriver` object. Use it exactly as you would with plain `selenium-webdriver`.

### Key Difference from Puppeteer/Playwright

Selenium connects to the LambdaTest hub via HTTP, not WebSocket. The adapter ignores `session.websocketUrl` and builds its own connection from the session config and environment variables.

### No Stealth Support

The Selenium adapter does **not** support stealth mode. Selenium WebDriver operates over the WebDriver protocol (HTTP), which does not provide the low-level browser control needed for stealth evasions (hiding `navigator.webdriver`, spoofing plugins, patching WebGL, etc.). These evasions require JavaScript injection before page load, which is only possible with CDP-based adapters (Puppeteer/Playwright).

If you need anti-detection, use the Puppeteer or Playwright adapter instead.

### Profile Persistence

Profile persistence works via cookies. On connect, if `profileId` is set, the adapter:

1. Reads `.profiles/{id}.json` (same format as Playwright adapter)
2. Groups cookies by domain
3. Navigates to each domain and injects cookies via `driver.manage().addCookie()`
4. On `driver.quit()`, saves current cookies back to the profile file

## Choosing an Adapter

| Use Case | Recommended Adapter |
|----------|-------------------|
| General automation | Puppeteer |
| Need stealth/anti-detection | Puppeteer (best plugin) or Playwright (custom scripts) |
| Need built-in waiting/selectors | Playwright |
| Need `page.fill()` or auto-waiting | Playwright |
| Existing Selenium test suite | Selenium |
| Standard WebDriver protocol | Selenium |
