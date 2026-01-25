# testMuBrowser 🚀

**The Enterprise-Grade Steel.dev Compatibility Layer for LambdaTest & Local Browsers**

[![CI](https://github.com/LambdaTest/testMuBrowser/actions/workflows/ci.yml/badge.svg)](https://github.com/LambdaTest/testMuBrowser/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/testmubrowser.svg)](https://www.npmjs.com/package/testmubrowser)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Run **AI agents** with **Puppeteer**, **Playwright**, or **Selenium** on **LambdaTest cloud** or **local browsers** using the Steel.dev API.

---

## 🚀 Installation

```bash
npm install testmubrowser
```

## ⚡️ Quick Start

```typescript
import { testMuBrowser } from 'testmubrowser';

const client = new testMuBrowser();

// Create a session (local or LambdaTest cloud)
const session = await client.sessions.create({
  local: true,  // or: lambdatestOptions: { build: 'My Build' }
  stealth: true,
  profileId: 'my-agent-profile'
});

// Connect via Puppeteer
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

await page.goto('https://example.com');

// AI Agent: Computer actions (click, type, screenshot)
const screenshot = await client.sessions.computer(session.id, page, {
  action: 'screenshot'
});

// Extract session context (cookies, localStorage)
const context = await client.sessions.context(session.id, page);

// Cleanup
await browser.close();
await client.sessions.release(session.id);
```

## 🔧 LambdaTest Cloud

```typescript
const session = await client.sessions.create({
  lambdatestOptions: {
    build: 'AI Agent Build',
    name: 'Production Test',
    platformName: 'Windows 11',
    browserName: 'Chrome',
    browserVersion: 'latest',
    'LT:Options': {
      username: process.env.LT_USERNAME,
      accessKey: process.env.LT_ACCESS_KEY,
      video: true
    }
  }
});
```

---

## 📖 Documentation

### Core Concepts
- [**Introduction**](docs/introduction.md) - Architecture & Philosophy
- [**Getting Started**](docs/getting-started.md) - Installation & First Script
- [**Sessions API**](docs/sessions.md) - Lifecycle, Configuration, Timeouts

### Key Features
- [**Persistence & Profiles**](docs/profiles.md) - Keep agents logged in
- [**Stealth & Anti-Detect**](docs/stealth.md) - Bypass bot protections
- [**Debugging & Observability**](docs/debugging.md) - Live Video, Logs

### APIs & Services
- [**Extensions**](docs/extensions.md) - Chrome Extension management
- [**Files API**](docs/files.md) - Upload/Download artifacts
- [**Credentials**](docs/credentials.md) - Secure credential management
- [**Captchas**](docs/captchas.md) - Integrated captcha solving
- [**Quick Actions**](docs/quick-actions.md) - `scrape()`, `screenshot()`, `pdf()`

### Framework Adapters
- [**Multi-Framework Guide**](docs/frameworks.md) - Puppeteer, Playwright, Selenium

---

## 🤖 AI Agent Features

### Computer Actions (Steel.dev Parity)

```typescript
// Mouse actions
await client.sessions.computer(sessionId, page, {
  action: 'click',
  coordinate: [100, 200]
});

// Keyboard
await client.sessions.computer(sessionId, page, {
  action: 'type',
  text: 'Hello World'
});

// Screenshot for AI vision
const { base64_image } = await client.sessions.computer(sessionId, page, {
  action: 'screenshot'
});
```

### Session Context

```typescript
// Extract cookies, localStorage, sessionStorage
const context = await client.sessions.context(sessionId, page);

// Create new session with pre-loaded context
const session = await client.sessions.create({
  sessionContext: context
});
```

### Quick Actions

```typescript
// One-liner scraping
const data = await client.scrape('https://example.com');

// Screenshot
const image = await client.screenshot({ url: 'https://example.com', fullPage: true });

// PDF
const pdf = await client.pdf({ url: 'https://example.com', format: 'A4' });
```

---

## 📂 Examples

See the [examples/](examples/) directory for complete working demos:

| Example | Description |
|---------|-------------|
| [full-api-demo.ts](examples/full-api-demo.ts) | All APIs in one file |
| [ai-agent-computer-actions.ts](examples/ai-agent-computer-actions.ts) | Computer actions |
| [context-and-profiles.ts](examples/context-and-profiles.ts) | Session persistence |
| [local-demo.ts](examples/local-demo.ts) | Local browser with stealth |

```bash
npx ts-node examples/local-demo.ts
```

---

## 🔄 Migrating from Steel.dev

testMuBrowser provides a **drop-in replacement** for Steel.dev SDK:

```typescript
// Steel.dev
import Steel from 'steel-sdk';
const client = new Steel({ steelAPIKey: 'sk_...' });

// testMuBrowser (same API!)
import { testMuBrowser } from 'testmubrowser';
const client = new testMuBrowser();
```

See [steel-migration.ts](examples/steel-migration.ts) for complete migration guide.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

```bash
git clone https://github.com/LambdaTest/testMuBrowser.git
cd testMuBrowser
npm install
npm test
```

## 🔐 Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## 📄 License

MIT © [LambdaTest](https://www.lambdatest.com)

---

<p align="center">
  <a href="https://www.lambdatest.com">
    <img src="https://www.lambdatest.com/resources/images/logos/logo.svg" alt="LambdaTest" width="200">
  </a>
  <br>
  <em>Powered by LambdaTest Cloud Infrastructure</em>
</p>
