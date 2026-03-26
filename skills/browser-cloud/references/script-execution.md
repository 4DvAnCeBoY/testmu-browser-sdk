# Script Execution

The `run` command executes a local script on TestMu Cloud browser infrastructure.

## Basic Usage

```bash
testmu-browser-cloud run ./my-script.ts
testmu-browser-cloud run ./my-script.js --adapter playwright
testmu-browser-cloud run ./tests/e2e.ts --adapter selenium
```

## Script Requirements

Your script must import from the `@testmuai/browser-cloud` SDK:

```ts
// my-script.ts
import { BrowserCloud } from '@testmuai/browser-cloud';

const browser = new BrowserCloud();
const session = await browser.sessions.create({ adapter: 'playwright' });
// ... your automation logic ...
await session.release();
```

The CLI injects credentials automatically via environment variables — no manual setup needed inside the script.

## Supported File Types

| Extension | Runtime         | Notes                        |
|-----------|-----------------|------------------------------|
| `.ts`     | `ts-node`       | TypeScript, transpiled on-the-fly |
| `.js`     | `node`          | CommonJS or ES module         |
| `.mjs`    | `node`          | ES module (explicit)          |
| `.cjs`    | `node`          | CommonJS (explicit)           |

`ts-node` must be available in your project or globally for `.ts` scripts.

## Credential Injection

The CLI automatically sets these environment variables before executing your script:

```
LT_USERNAME=<your_username>
LT_ACCESS_KEY=<your_access_key>
```

The SDK reads these automatically. You do not need to pass credentials in your script.

## Passing Extra Environment Variables

```bash
testmu-browser-cloud run ./script.ts --env TARGET_URL=https://staging.example.com
testmu-browser-cloud run ./script.ts --env ENV=staging --env DEBUG=true
```

Inside the script:

```ts
const url = process.env.TARGET_URL;
```

## Adapter Selection

```bash
testmu-browser-cloud run ./script.ts --adapter puppeteer
testmu-browser-cloud run ./script.ts --adapter playwright
testmu-browser-cloud run ./script.ts --adapter selenium
```

If not specified, the script's own `sessions.create()` call controls the adapter.

## TypeScript Setup

Ensure your project has `ts-node` and the SDK installed:

```bash
npm install --save-dev ts-node typescript
npm install @testmuai/browser-cloud
```

A minimal `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true
  }
}
```

## JavaScript (ESM) Setup

For `.mjs` scripts, use the ESM import syntax:

```js
// script.mjs
import { BrowserCloud } from '@testmuai/browser-cloud';
const browser = new BrowserCloud();
```
