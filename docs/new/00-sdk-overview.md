# testMuBrowser SDK Overview

## What is testMuBrowser?

testMuBrowser is a TypeScript SDK for browser automation that provides a unified API across **Puppeteer** and **Playwright**. It runs browsers on **LambdaTest cloud infrastructure** with built-in stealth, session persistence, and file/extension management.

It is designed as a drop-in alternative to Steel.dev, running on LambdaTest's 3000+ browser/OS infrastructure instead of Steel's hosted service.

## Architecture

```
┌──────────────────────────────────────────────┐
│              Your Application                │
│                                              │
│   const client = new testMuBrowser()         │
│   const session = await client.sessions...   │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│           testMuBrowser SDK                  │
│                                              │
│  ┌─────────┐ ┌──────────┐                    │
│  │Puppeteer│ │Playwright│          Adapters  │
│  └────┬────┘ └─────┬────┘                    │
│       │            │                         │
│  ┌────▼────────────▼───────────────┐         │
│  │       Session Manager           │         │
│  │  (creates sessions, builds WS)  │         │
│  └─────────────┬───────────────────┘         │
│                │                             │
│  ┌─────────────▼───────────────────┐         │
│  │          Services               │         │
│  │  Context | Profile | Stealth    │         │
│  │  Files | Extensions | Tunnel    │         │
│  │  Quick Actions (Scrape/SS/PDF)  │         │
│  └─────────────────────────────────┘         │
└──────────────┬───────────────────────────────┘
               │ WebSocket (CDP)
┌──────────────▼───────────────────────────────┐
│           LambdaTest Cloud                   │
│          (Real browsers)                     │
└──────────────────────────────────────────────┘
```

## Core Concepts

### Sessions
A session represents a single browser instance. You create one, connect to it with your chosen adapter, do your work, and release it.

### Adapters
The adapter determines which automation library you use to interact with the browser. The same session can be connected to via Puppeteer or Playwright — the underlying browser is the same.

### Services
Services provide capabilities on top of the browser: extracting cookies, saving profiles, managing files, injecting stealth scripts, etc.

## Execution Mode

testMuBrowser runs browsers on **LambdaTest cloud infrastructure**. Set your `LT_USERNAME` and `LT_ACCESS_KEY` environment variables and the SDK handles the rest.

## Quick Example

```typescript
import { testMuBrowser } from 'testmubrowser';

const client = new testMuBrowser();

// Create a cloud session
const session = await client.sessions.create({
    adapter: 'puppeteer',
    lambdatestOptions: {
        build: 'My Build',
        name: 'My Test',
        'LT:Options': {
            username: process.env.LT_USERNAME,
            accessKey: process.env.LT_ACCESS_KEY,
        }
    }
});

// Connect and automate
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];
await page.goto('https://example.com');
const title = await page.title();

// Cleanup
await browser.close();
await client.sessions.release(session.id);
```

## Feature Map

All features below are implemented and tested with integration tests in `test-features/`.

| Feature | Doc | Test |
|---------|-----|------|
| Session Management | [02-sessions.md](./02-sessions.md) | 01a, 01b, 01c, 01d |
| Puppeteer Adapter | [03-adapters.md](./03-adapters.md) | 01a |
| Playwright Adapter | [03-adapters.md](./03-adapters.md) | 01b |
| Stealth Mode | [04-stealth-mode.md](./04-stealth-mode.md) | 08 |
| Quick Actions | [05-quick-actions.md](./05-quick-actions.md) | 02a, 02b, 02c |
| Context Service | [06-context-service.md](./06-context-service.md) | 03 |
| Profile Service | [07-profile-service.md](./07-profile-service.md) | 05 |
| File Service | [08-file-service.md](./08-file-service.md) | 07 |
| Extension Service | [09-extension-service.md](./09-extension-service.md) | 06 |
| Tunnel Service | [10-tunnel-service.md](./10-tunnel-service.md) | 04 |
| Debugging | [11-debugging.md](./11-debugging.md) | - |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LT_USERNAME` | Yes (cloud) | LambdaTest account username |
| `LT_ACCESS_KEY` | Yes (cloud) | LambdaTest API access key |
