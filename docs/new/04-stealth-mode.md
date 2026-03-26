# Stealth Mode

Stealth mode makes automated browsers look like real human users to bot-detection systems. When you automate a browser with Puppeteer or Playwright, it leaves detectable fingerprints (like `navigator.webdriver = true`). Stealth mode removes or fakes these fingerprints.

## Quick Start

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

That's it. The adapter handles everything else automatically.

## StealthConfig Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `humanizeInteractions` | `boolean` | `false` | Add random delays to clicks and typing |
| `skipFingerprintInjection` | `boolean` | `false` | Disable all stealth (Puppeteer only) |
| `randomizeUserAgent` | `boolean` | `true` | Pick a random user-agent from the pool |
| `randomizeViewport` | `boolean` | `true` | Add +/-20px jitter to viewport dimensions |

## What Gets Patched

### Puppeteer Stealth (via puppeteer-extra-plugin-stealth)

The Puppeteer adapter uses `puppeteer-extra` with the stealth plugin, which patches:
- `navigator.webdriver` (set to `undefined`)
- Chrome runtime objects
- WebGL vendor/renderer
- Permission queries
- Language and platform strings
- iframe contentWindow access
- Console.debug behavior
- And ~15 more evasions

### Playwright Stealth (via custom init scripts)

Since Playwright has no equivalent plugin, the SDK injects scripts via `page.addInitScript()`:

| Evasion | What It Does |
|---------|-------------|
| `navigator.webdriver = false` | Hides the automation flag |
| Fake `chrome.runtime` | Makes it look like Chrome extensions are present |
| Fake `navigator.plugins` | Injects 3 standard Chrome plugins (PDF Plugin, PDF Viewer, Native Client) |
| `navigator.languages` | Set to `['en-US', 'en']` |
| `permissions.query` | Returns `'denied'` for notifications (matches real Chrome) |
| WebGL spoofing | Reports "Intel Inc." / "Intel Iris OpenGL Engine" as GPU |

These scripts run before any page JavaScript executes, so detection scripts cannot observe the original values.

## User-Agent Randomization

When `randomizeUserAgent` is enabled (default when any `stealthConfig` is set), the SDK picks from a pool of 7 realistic user-agent strings:

```
Chrome 120 on Windows 10
Chrome 120 on macOS
Firefox 121 on Windows 10
Firefox 121 on macOS
Chrome 120 on Linux
Chrome 119 on Windows 10
Chrome 119 on macOS
```

The user-agent is selected once at session creation time and stays consistent for the entire session. If you provide an explicit `userAgent` in the session config, it takes priority over the random pool.

## Viewport Randomization

When `randomizeViewport` is enabled, the SDK adds random jitter of +/-20 pixels to the base viewport dimensions:

```
Base: 1920x1080
Actual: 1907x1063 (varies each session)
```

This prevents the exact "1920x1080" fingerprint that bots typically have.

## Humanized Interactions

When `humanizeInteractions: true`, the SDK monkey-patches interaction methods:

### Puppeteer
- **`page.click(selector)`** — Adds a random 50-150ms delay before clicking
- **`page.type(selector, text)`** — Types with a random 30-130ms delay between characters

### Playwright
- **`page.click(selector)`** — Adds a random 50-150ms delay before clicking
- **`page.type(selector, text)`** — Types with a random 30-130ms delay between characters
- **`page.fill(selector, value)`** — Adds a random 50-150ms delay before filling

New pages created during the session automatically get the same humanized behavior.

## Stealth OFF (Baseline)

To explicitly disable stealth (useful for comparison tests):

```typescript
const session = await client.sessions.create({
    adapter: 'puppeteer',
    stealthConfig: {
        skipFingerprintInjection: true,  // No stealth plugin
        randomizeUserAgent: false,        // Keep default UA
        randomizeViewport: false,         // Keep exact viewport
    },
    ...
});
```

## Testing Stealth

The SDK includes a comparison test at `test-features/08-stealth-mode.ts` that:

1. Creates a Puppeteer session with stealth ON
2. Creates a Puppeteer session with stealth OFF
3. Creates a Playwright session with stealth ON
4. All three visit `bot.sannysoft.com` (a bot detection test site)
5. Saves screenshots to `test-output/` for visual comparison

Run it:
```bash
npm run build
npx ts-node test-features/08-stealth-mode.ts
```

Expected: Stealth ON sessions show green checks on the bot detection site; stealth OFF shows red failures for `navigator.webdriver` and other checks.

## How It Works Internally

```
Session Creation
    │
    ├─ stealthConfig present?
    │   ├─ Yes: auto-pick random UA, store on session.userAgent
    │   └─ No: skip
    │
    ▼
Adapter.connect()
    │
    ├─ Puppeteer:
    │   ├─ skipFingerprintInjection? → puppeteer.connect() (raw)
    │   └─ else → puppeteerExtra.connect() (with stealth plugin)
    │   ├─ Set random UA via page.setUserAgent()
    │   ├─ Set random viewport via page.setViewport()
    │   └─ Humanize: monkey-patch click/type
    │
    └─ Playwright:
        ├─ Inject stealth scripts via page.addInitScript()
        ├─ Set random UA via page.evaluate()
        ├─ Set random viewport via page.setViewportSize()
        ├─ Humanize: monkey-patch click/type/fill
        └─ Auto-apply to new pages via context.on('page')
```
