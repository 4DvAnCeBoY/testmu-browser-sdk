# TestMu AI Browser Cloud SDK

**Web Browser for AI Agents powered by TestMu AI**

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Connect with **Puppeteer**, **Playwright**, or **Selenium** to TestMu AI Browser Cloud — with built-in stealth, session persistence, and full observability.

Works as a **Claude Code plugin**, **CLI tool**, and **Node.js SDK**.

---

## Claude Code Plugin

Install the plugin to give Claude Code browser automation superpowers:

```bash
# Add the marketplace
claude plugin marketplace add 4DvAnCeBoY/testmu-browser-sdk

# Install the plugin
claude plugin install browser-cloud
```

On first session, you'll be prompted to configure credentials:

```bash
testmu-browser-cloud setup
```

Once installed, Claude Code automatically uses the plugin when you ask it to scrape websites, take screenshots, test URLs, or run browser automation scripts on the cloud.

---

## CLI Tool

Use `testmu-browser-cloud` directly from the terminal. All commands output JSON.

### Setup

```bash
npm install -g @testmuai/browser-cloud
testmu-browser-cloud setup
```

### Quick Actions (no session needed)

```bash
# Scrape a webpage
testmu-browser-cloud scrape https://www.lambdatest.com/pricing --format markdown

# Take a screenshot
testmu-browser-cloud screenshot https://playwright.dev --full-page --output page.png

# Generate a PDF
testmu-browser-cloud pdf https://news.ycombinator.com --output hn.pdf
```

### Run Existing Scripts on Cloud

Run your existing Puppeteer, Playwright, or Selenium scripts on LambdaTest cloud **with zero code changes**:

```bash
# Your existing Playwright test — runs on cloud automatically
testmu-browser-cloud run my-playwright-test.js --platform-name "Windows 11"

# Your existing Puppeteer script
testmu-browser-cloud run scraper.js --browser-name Chrome --browser-version latest

# Your existing Selenium test
testmu-browser-cloud run selenium-suite.js --platform-name "macOS Sonoma"
```

The CLI auto-detects which adapter your script uses and transparently patches `launch()` to connect to LambdaTest cloud. No SDK imports needed.

### Session Workflow (multi-step automation)

```bash
# Create a cloud browser session
SESSION_ID=$(testmu-browser-cloud session create --adapter playwright --stealth | jq -r '.data.id')

# Interact with the browser
testmu-browser-cloud click 100 200 --session $SESSION_ID
testmu-browser-cloud type "hello world" --session $SESSION_ID
testmu-browser-cloud key Enter --session $SESSION_ID
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output result.png

# Release when done
testmu-browser-cloud session release $SESSION_ID
```

### All CLI Commands

| Category | Commands |
|----------|----------|
| **Setup** | `setup` |
| **Quick Actions** | `scrape`, `screenshot`, `pdf` |
| **Sessions** | `session create`, `session list`, `session info`, `session release`, `session release-all` |
| **Computer Actions** | `click`, `double-click`, `right-click`, `type`, `key`, `scroll`, `move`, `computer-screenshot` |
| **Script Execution** | `run` |
| **Files** | `file upload`, `file download`, `file list`, `file delete`, `file delete-all`, `file download-archive` |
| **Context** | `context get`, `context set`, `context clear` |
| **Profiles** | `profile list`, `profile save`, `profile load`, `profile delete`, `profile export`, `profile import` |
| **Extensions** | `extension register`, `extension list`, `extension delete` |
| **Credentials** | `credential add`, `credential list`, `credential get`, `credential find`, `credential delete` |
| **Captcha** | `captcha solve`, `captcha status` |
| **Tunnel** | `tunnel start`, `tunnel stop`, `tunnel status` |
| **Events** | `events`, `live-details` |

Run `testmu-browser-cloud --help` for details on any command.

---

## Node.js SDK

Use the SDK directly in your code for full programmatic control.

### Installation

```bash
npm install @testmuai/browser-cloud
```

### Quick Start

```typescript
import { Browser } from '@testmuai/browser-cloud';

const client = new Browser();

const session = await client.sessions.create({
  adapter: 'puppeteer',
  stealthConfig: {
    humanizeInteractions: true,
    randomizeUserAgent: true,
  },
  lambdatestOptions: {
    build: 'My Agent',
    name: 'First Run',
    platformName: 'Windows 11',
    browserName: 'Chrome',
    browserVersion: 'latest',
    'LT:Options': {
      username: process.env.LT_USERNAME,
      accessKey: process.env.LT_ACCESS_KEY,
      video: true,
    }
  }
});

const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

await page.goto('https://news.ycombinator.com');
console.log(await page.title());

await browser.close();
await client.sessions.release(session.id);
```

### Adapters

**Puppeteer**

```typescript
const session = await client.sessions.create({ adapter: 'puppeteer', ... });
const browser = await client.puppeteer.connect(session);
```

**Playwright** (requires Node 18+)

```typescript
const session = await client.sessions.create({ adapter: 'playwright', ... });
const { browser, context, page } = await client.playwright.connect(session);
```

**Selenium**

```typescript
const session = await client.sessions.create({ adapter: 'selenium', ... });
const driver = await client.selenium.connect(session);
```

### Stealth Mode

Patches 15+ browser fingerprints automatically.

```typescript
const session = await client.sessions.create({
  adapter: 'puppeteer',
  stealthConfig: {
    humanizeInteractions: true,
    randomizeUserAgent: true,
    randomizeViewport: true,
  },
  lambdatestOptions: { ... }
});
```

### Quick Actions

One-liner operations — no session management needed.

```typescript
const data = await client.scrape({ url: 'https://www.lambdatest.com/pricing', format: 'markdown' });
const image = await client.screenshot({ url: 'https://playwright.dev', fullPage: true, format: 'png' });
const pdf = await client.pdf({ url: 'https://news.ycombinator.com', format: 'A4' });
```

### Computer Actions (AI Vision Agents)

```typescript
await client.sessions.computer(session.id, page, { action: 'click', coordinate: [100, 200] });
await client.sessions.computer(session.id, page, { action: 'type', text: 'Hello World' });
const { base64_image } = await client.sessions.computer(session.id, page, { action: 'screenshot' });
```

### Session Context

Extract and inject browser state across sessions.

```typescript
const context = await client.context.getContext(page);
await client.context.setContext(newPage, context);
```

### Profiles

Persist browser state to disk. Log in once, skip login forever.

```typescript
const session = await client.sessions.create({
  adapter: 'puppeteer',
  profileId: 'my-app-login',
  lambdatestOptions: { ... }
});
```

### File Service

```typescript
await client.files.uploadToSession(session.id, fileBuffer, 'document.pdf');
const result = await client.files.downloadFromSession(session.id, 'report.csv');
```

### Extensions

```typescript
const ext = await client.extensions.register({ name: 'My Extension', version: '1.0.0', cloudUrl: '...' });
const session = await client.sessions.create({ extensionIds: [ext.id], ... });
```

### Tunnel

Access localhost from cloud browsers.

```typescript
const session = await client.sessions.create({ tunnel: true, tunnelName: 'my-tunnel', ... });
await page.goto('http://localhost:3000');
```

---

## Cross-Browser Testing

Test across platforms and browsers on LambdaTest cloud.

```bash
# Chrome on Windows 11
testmu-browser-cloud run test.js --platform-name "Windows 11" --browser-name Chrome

# Edge on Windows 11
testmu-browser-cloud run test.js --platform-name "Windows 11" --browser-name MicrosoftEdge

# Firefox via Playwright (use pw-firefox)
testmu-browser-cloud run test.js --adapter playwright --browser-name pw-firefox

# WebKit/Safari via Playwright
testmu-browser-cloud run test.js --adapter playwright --browser-name pw-webkit
```

**Playwright browser names on LambdaTest:** `chrome`, `MicrosoftEdge`, `pw-chromium`, `pw-firefox`, `pw-webkit`

---

## Authentication

Credentials are resolved in this order:

1. CLI flags (`--username`, `--key`)
2. Environment variables (`LT_USERNAME`, `LT_ACCESS_KEY`)
3. Config file (`~/.testmuai/config.json`)

```bash
# Interactive setup
testmu-browser-cloud setup

# Non-interactive
testmu-browser-cloud setup --username YOUR_USERNAME --key YOUR_ACCESS_KEY

# Environment variables (for CI/Docker)
export LT_USERNAME=your_username
export LT_ACCESS_KEY=your_access_key
```

Sign up at [testmuai.com](https://www.testmuai.com) to get your credentials.

---

## Examples

See the [examples/](examples/) directory:

- `standard-puppeteer.js` — Puppeteer script (no SDK, auto-routed to cloud)
- `standard-playwright.js` — Playwright script (no SDK, auto-routed to cloud)
- `standard-selenium.js` — Selenium script (no SDK, auto-routed to cloud)
- `ecommerce-checkout-test.js` — Full e-commerce checkout flow
- `form-validation-test.js` — Login form validation
- `mobile-responsive-test.js` — Mobile viewport testing
- `test-suite/` — 60-test comprehensive test suite

---

## For AI Tools (Gemini CLI, Codex, Aider)

See [AGENTS.md](AGENTS.md) for instructions on using the CLI from any AI coding tool.

---

## Running Tests

```bash
npm test                    # Unit tests
npm run build               # TypeScript build
npm run typecheck            # Type checking only
```

---

## License

MIT

---

<p align="center">
  <a href="https://www.testmuai.com">
    <img src="https://assets.testmuai.com/resources/images/logos/logo.svg" alt="TestMu AI" width="200">
  </a>
  <br>
  <sub>Built by TestMu AI</sub>
</p>
