# Getting Started

## Installation

```bash
npm install testmubrowser
```

## Prerequisites

- **Node.js 16+** (Node 18+ required if using Playwright adapter)
- **LambdaTest account** for cloud execution

## Set Up Credentials

```bash
export LT_USERNAME="your_username"
export LT_ACCESS_KEY="your_access_key"
```

## Your First Script

```typescript
import { testMuBrowser } from 'testmubrowser';

async function main() {
    const client = new testMuBrowser();

    // 1. Create a session on LambdaTest cloud
    const session = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'Getting Started',
            name: 'First Test',
            'LT:Options': {
                username: process.env.LT_USERNAME,
                accessKey: process.env.LT_ACCESS_KEY,
            }
        }
    });

    // 2. Connect via Puppeteer
    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];

    // 3. Automate
    await page.goto('https://example.com');
    console.log('Title:', await page.title());

    // 4. Cleanup
    await browser.close();
    await client.sessions.release(session.id);
}

main();
```

Run it:
```bash
npx ts-node your-script.ts
```

## Running the Test Suite

The SDK includes integration tests in `test-features/`:

```bash
# Build first
npm run build

# Run a specific test
npx ts-node test-features/01a-session-create-puppeteer.ts

# Run all tests
./test.sh
```

## Next Steps

- [Sessions](./02-sessions.md) - Full session configuration options
- [Adapters](./03-adapters.md) - Puppeteer vs Playwright
- [Stealth Mode](./04-stealth-mode.md) - Anti-bot detection
- [Quick Actions](./05-quick-actions.md) - One-liner scrape/screenshot/PDF
