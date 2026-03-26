# TestMu AI Browser Cloud SDK

**Web Browser for AI Agents powered by TestMu AI**

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Connect with **Puppeteer**, **Playwright**, or **Selenium** to TestMu AI Browser Cloud or local browsers - with built-in stealth, session persistence, and full observability.

```typescript
import { Browser } from '@testmuai/browser-cloud';

const client = new Browser();
const session = await client.sessions.create({ adapter: 'puppeteer', ... });
const browser = await client.puppeteer.connect(session);
```

---

## Installation

```bash
npm install @testmuai/browser-cloud
```

**Requirements:** Node.js 16+ (Node 18+ for Playwright adapter)

---

## Quick Start

```typescript
import { Browser } from '@testmuai/browser-cloud';

const client = new Browser();

// Create a session
const session = await client.sessions.create({
  adapter: 'puppeteer',
  stealthConfig: {
    humanizeInteractions: true,
    randomizeUserAgent: true,
  },
  profileId: 'my-agent-profile',
  lambdatestOptions: {
    build: 'My Agent',
    name: 'First Run',
    'LT:Options': {
      username: process.env.LT_USERNAME,
      accessKey: process.env.LT_ACCESS_KEY,
    }
  }
});

// Connect via Puppeteer
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

await page.goto('https://example.com');
console.log(await page.title());

// Cleanup
await browser.close();
await client.sessions.release(session.id);
```

---

## Features

### Adapters

Connect with your preferred automation library. All three connect to the same cloud infrastructure.

**Puppeteer**

```typescript
const session = await client.sessions.create({ adapter: 'puppeteer', ... });
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];
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

Make your agent's browser indistinguishable from a real user. Patches 15+ browser fingerprints automatically.

```typescript
const session = await client.sessions.create({
  adapter: 'puppeteer',
  stealthConfig: {
    humanizeInteractions: true,   // Random delays on clicks and typing
    randomizeUserAgent: true,     // Pick from pool of realistic UAs
    randomizeViewport: true,      // +/-20px jitter on viewport dimensions
  },
  lambdatestOptions: { ... }
});
```

Puppeteer uses `puppeteer-extra` with the stealth plugin. Playwright uses custom init scripts injected before page load. Both handle user-agent, viewport, and interaction humanization automatically.


### Session Context

Extract and inject browser state (cookies, localStorage, sessionStorage) across sessions. Log in once, skip login forever.

```typescript
// Extract from a logged-in session
const context = await client.context.getContext(page);

// Inject into a new session
await client.context.setContext(newPage, context);

// Or pass it at session creation
const session = await client.sessions.create({
  sessionContext: savedContext,
  ...
});
```


### Profiles

Persist browser state to disk across separate script runs. Your agent logs in once, the profile auto-saves on `browser.close()`, and every future run loads the saved state.

```typescript
const session = await client.sessions.create({
  adapter: 'puppeteer',
  profileId: 'my-app-login',   // Auto-loads and auto-saves
  lambdatestOptions: { ... }
});
```

Manual management:

```typescript
await client.profiles.saveProfile('my-profile', page);
await client.profiles.loadProfile('my-profile', page);
const profiles = await client.profiles.listProfiles();
await client.profiles.deleteProfile('my-profile');
```


### Quick Actions

One-liner operations. No session management needed - the SDK handles browser setup, navigation, and cleanup.

```typescript
// Scrape content
const data = await client.scrape({
  url: 'https://example.com',
  format: 'markdown',   // 'html' | 'markdown' | 'text' | 'readability'
});

// Screenshot
const image = await client.screenshot({
  url: 'https://example.com',
  fullPage: true,
  format: 'png',
});

// PDF
const pdf = await client.pdf({
  url: 'https://example.com',
  format: 'A4',
});
```


### Computer Actions

Drive the browser through coordinate-based actions for AI vision agents.

```typescript
// Click at coordinates
await client.sessions.computer(session.id, page, {
  action: 'click',
  coordinate: [100, 200]
});

// Type text
await client.sessions.computer(session.id, page, {
  action: 'type',
  text: 'Hello World'
});

// Screenshot for AI vision loop
const { base64_image } = await client.sessions.computer(session.id, page, {
  action: 'screenshot'
});
```


### File Service

Transfer files between your local machine and the cloud browser.

```typescript
// Upload
const fileBuffer = fs.readFileSync('document.pdf');
await client.files.uploadToSession(session.id, fileBuffer, 'document.pdf');

// Download
const result = await client.files.downloadFromSession(session.id, 'https://example.com/report.csv');
fs.writeFileSync('report.csv', result);
```


### Extensions

Load Chrome extensions into cloud sessions.

```typescript
const ext = await client.extensions.register({
  name: 'My Extension',
  version: '1.0.0',
  cloudUrl: 'https://s3.amazonaws.com/bucket/extension.zip',
});

const session = await client.sessions.create({
  adapter: 'puppeteer',
  extensionIds: [ext.id],
  lambdatestOptions: { ... }
});
```


### Tunnel

Access localhost and internal networks from cloud browsers.

```typescript
const session = await client.sessions.create({
  adapter: 'puppeteer',
  tunnel: true,
  tunnelName: 'my-tunnel',
  lambdatestOptions: { ... }
});

// Cloud browser can now reach localhost
await page.goto('http://localhost:3000');
```

---

## TestMu AI Browser Cloud

Connect to TestMu AI's cloud infrastructure for production workloads. Every session comes with video recording, console logs, network capture, and a live session viewer.

```typescript
const session = await client.sessions.create({
  adapter: 'puppeteer',
  lambdatestOptions: {
    build: 'AI Agent Build',
    name: 'Production Run',
    platformName: 'Windows 11',
    browserName: 'Chrome',
    browserVersion: 'latest',
    'LT:Options': {
      username: process.env.LT_USERNAME,
      accessKey: process.env.LT_ACCESS_KEY,
      video: true,
      console: true,
    }
  }
});

console.log('Live viewer:', session.sessionViewerUrl);
console.log('Dashboard:', session.debugUrl);
```

**Environment variables:**

```bash
export LT_USERNAME=your_username
export LT_ACCESS_KEY=your_access_key
```

Sign up at [testmuai.com](https://www.testmuai.com) to get your credentials.

---

## Examples

See the [examples/](examples/) directory for complete working demos:

---

## Running Tests

```bash
# Run all tests (local + cloud)
./test.sh

# Local tests only (no cloud credentials needed)
./test.sh quick

# Cloud tests only
./test.sh cloud

# Build only
./test.sh build
```

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
