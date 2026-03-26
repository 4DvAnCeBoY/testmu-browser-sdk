# Stealth Mode

Stealth mode patches browser fingerprints to reduce detection by anti-bot systems.

## Enabling Stealth

```bash
testmu-browser-cloud session create --adapter puppeteer --stealth
```

Stealth mode is supported on all adapters but most effective with Puppeteer.

## What Gets Patched

Stealth mode patches 15+ fingerprint vectors, including:

1. `navigator.webdriver` — removed or set to `false`
2. `navigator.plugins` — realistic plugin list injected
3. `navigator.languages` — natural language array
4. `navigator.permissions` — patched to avoid automation signals
5. Chrome runtime (`window.chrome`) — presence faked
6. `navigator.hardwareConcurrency` — realistic CPU count
7. `navigator.deviceMemory` — realistic memory value
8. Canvas fingerprint — slight noise added
9. WebGL vendor/renderer — spoofed to real GPU strings
10. Audio context fingerprint — randomized
11. `screen.colorDepth` / `screen.pixelDepth` — normalized
12. `navigator.connection` — realistic network info
13. `window.outerWidth` / `outerHeight` — matched to viewport
14. `Date.prototype.getTimezoneOffset` — consistent timezone
15. `Intl.DateTimeFormat` — consistent locale/timezone

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `humanizeInteractions` | boolean | `true` | Adds small delays and mouse curves to actions |
| `randomizeUserAgent` | boolean | `true` | Rotates user agent string per session |
| `randomizeViewport` | boolean | `false` | Randomizes viewport size within common ranges |

These options are configured via the SDK when creating sessions programmatically:

```ts
const session = await browser.sessions.create({
  adapter: 'puppeteer',
  stealth: {
    enabled: true,
    humanizeInteractions: true,
    randomizeUserAgent: true,
    randomizeViewport: false,
  }
});
```

## Notes

- Stealth increases session startup time slightly (~200–500ms)
- Not a guarantee against all detection; combine with proxies and natural timing
- For AI agent use cases, enable `humanizeInteractions` to simulate real user behavior
