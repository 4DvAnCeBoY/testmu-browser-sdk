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

## Page Service (AI Agent Browser Interaction)

The Page Service provides AI agents with structured, accessible browser control — no screenshots or coordinates required. It exposes an accessibility-tree-based snapshot system with stable `@ref` element IDs so agents can click, fill, and query page content reliably across sessions.

### Snapshot & Refs

```bash
# Capture the accessibility tree with @ref element IDs
testmu-browser-cloud page snapshot --session $SESSION_ID

# Show only what changed since the last snapshot (cross-process, persisted)
testmu-browser-cloud page snapshot --diff --session $SESSION_ID

# Token-efficient compact text output
testmu-browser-cloud page snapshot --compact --session $SESSION_ID
```

Snapshot output assigns each interactive element a stable `@ref` ID (e.g. `@e12`). Use these refs in subsequent commands instead of coordinates.

### Interaction Commands

```bash
# Click an element by @ref or CSS selector
testmu-browser-cloud page click @e12 --session $SESSION_ID
testmu-browser-cloud page click "#submit-btn" --session $SESSION_ID

# Fill an input field
testmu-browser-cloud page fill @e5 "user@example.com" --session $SESSION_ID

# Type text (character by character, for inputs that need events)
testmu-browser-cloud page type @e5 "hello world" --session $SESSION_ID

# Select a dropdown option
testmu-browser-cloud page select @e8 "option-value" --session $SESSION_ID

# Check or uncheck a checkbox
testmu-browser-cloud page check @e3 --session $SESSION_ID

# Hover over an element
testmu-browser-cloud page hover @e7 --session $SESSION_ID

# Press a key (supports keyboard shortcuts)
testmu-browser-cloud page press "Enter" --session $SESSION_ID
testmu-browser-cloud page press "Control+A" --session $SESSION_ID

# Scroll the page or an element
testmu-browser-cloud page scroll down 300 --session $SESSION_ID
testmu-browser-cloud page scroll @e4 right 200 --session $SESSION_ID

# Wait for an element to appear or a fixed delay
testmu-browser-cloud page wait "#modal" --session $SESSION_ID
testmu-browser-cloud page wait 2000 --session $SESSION_ID
testmu-browser-cloud page wait @e6 --session $SESSION_ID
```

### Query Commands

```bash
# Get inner text, HTML, value, attribute, current URL, or page title
testmu-browser-cloud page get text @e10 --session $SESSION_ID
testmu-browser-cloud page get html @e10 --session $SESSION_ID
testmu-browser-cloud page get value @e5 --session $SESSION_ID
testmu-browser-cloud page get attr @e10 href --session $SESSION_ID
testmu-browser-cloud page get url --session $SESSION_ID
testmu-browser-cloud page get title --session $SESSION_ID
```

### State Check Commands

```bash
testmu-browser-cloud page is visible @e4 --session $SESSION_ID
testmu-browser-cloud page is enabled @e8 --session $SESSION_ID
testmu-browser-cloud page is checked @e3 --session $SESSION_ID
```

### Find Commands

```bash
# Find elements by ARIA role
testmu-browser-cloud page find role button --session $SESSION_ID

# Find elements by visible text (partial match)
testmu-browser-cloud page find text "Sign in" --session $SESSION_ID

# Find by ARIA label
testmu-browser-cloud page find label "Email address" --session $SESSION_ID
```

### JavaScript Evaluation

JavaScript evaluation is **blocked by default** to prevent prompt injection and unintended side effects. Pass `--allow-unsafe` explicitly when evaluation is required.

```bash
# Blocked by default — this will error
testmu-browser-cloud page eval "document.title" --session $SESSION_ID

# Explicitly opt in
testmu-browser-cloud page eval "document.title" --allow-unsafe --session $SESSION_ID
```

### SDK Usage

```typescript
import { Browser } from '@testmuai/browser-cloud';

const client = new Browser();
const session = await client.sessions.create({ adapter: 'playwright', ... });

// Capture snapshot
const snapshot = await client.page.snapshot(session.id);

// Interact using @ref IDs from the snapshot
await client.page.click(session.id, '@e12');
await client.page.fill(session.id, '@e5', 'user@example.com');
await client.page.press(session.id, 'Enter');

// Query
const title = await client.page.get(session.id, 'title');
const url   = await client.page.get(session.id, 'url');

// Evaluate (opt-in only)
const result = await client.page.evaluate(session.id, 'document.title', { allowUnsafe: true });
```

### Parallel Session Isolation

When multiple AI agents run against the same cloud session, refs and snapshots must be isolated per agent. Pass `--client-id` on every page command:

```bash
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id agent-1
testmu-browser-cloud page click @e12 --session $SESSION_ID --client-id agent-1
```

Each client gets its own isolated ref map (`refs.{clientId}.json`), snapshot diff base (`prev-snapshot.{clientId}.json`), and page state (`page-state.{clientId}.json`). When `--client-id` is omitted, a per-process default (`cli-{pid}`) is used automatically.

### Session Reconnection

The page service persists the last navigated URL to `page-state.json` so that CLI-based agents can reconnect across process boundaries without losing their place:

```bash
# First process navigates somewhere
testmu-browser-cloud page snapshot --session $SESSION_ID   # navigates automatically if needed

# Later process reconnects — auto-navigates to the last known URL
testmu-browser-cloud page snapshot --session $SESSION_ID

# Disable auto-navigation if you want a clean slate
testmu-browser-cloud page snapshot --session $SESSION_ID --no-auto-navigate
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
