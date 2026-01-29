# Adapters: Puppeteer and Playwright

testMuBrowser supports Puppeteer and Playwright for browser automation. You choose which one via the `adapter` field in session config. The underlying browser is the same — only the client-side API changes.

## Comparison

| Feature | Puppeteer | Playwright |
|---------|-----------|------------|
| Connection | WebSocket CDP | WebSocket CDP |
| Stealth Plugin | puppeteer-extra-plugin-stealth | Custom init scripts |
| Return Type | `Browser` | `{ browser, context, page }` |
| Humanize Methods | `click`, `type` | `click`, `type`, `fill` |

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

## Choosing an Adapter

| Use Case | Recommended Adapter |
|----------|-------------------|
| General automation | Puppeteer |
| Need stealth/anti-detection | Puppeteer (best plugin) or Playwright (custom scripts) |
| Need built-in waiting/selectors | Playwright |
| Need `page.fill()` or auto-waiting | Playwright |
