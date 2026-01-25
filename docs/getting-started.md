# Getting Started

## Installation

```bash
npm install testMuBrowser puppeteer-core playwright-core
```

## Configuration

To use **LambdaTest Cloud**, set your credentials:

```bash
export LT_USERNAME="your_username"
export LT_ACCESS_KEY="your_access_key"
```

To run **Locally**, no credentials are required.

## Basic Usage

```typescript
import { testMuBrowser } from 'testMuBrowser';

const client = new testMuBrowser();

// 1. Create a Session
const session = await client.sessions.create({
    stealth: true  // Enable anti-detection
});

// 2. Connect (using Puppeteer Adapter)
const browser = await client.puppeteer.connect(session);
const page = await browser.newPage();

await page.goto('https://example.com');

// 3. Cleanup
await browser.close();
await client.sessions.release(session.id);
```
