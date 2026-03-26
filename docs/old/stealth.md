# Stealth & Anti-Detect

Modern websites use advanced bot detection systems (like Cloudflare, Akamai, Datadome, and FingerprintJS) to block automated traffic. **testMuBrowser** includes built-in stealth capabilities to bypass these checks.

## Enabling Stealth

Stealth is enabled by default in `testMuBrowser` sessions unless explicitly disabled `stealth: false` (not recommended for public web agents).

```typescript
const session = await client.sessions.create({
    stealth: true // Injects anti-detect scripts
});
```

## What does Stealth do?

When enabled, `testMuBrowser` utilizes `puppeteer-extra-plugin-stealth` (and equivalent logic for Playwright) to patch the browser fingerprint.

### 1. User Agent Rotation
The SDK automatically selects a modern, realistic User-Agent string matching the browser engine version, avoiding "HeadlessChrome" signatures.

### 2. Navigator Property Masking
*   **`navigator.webdriver`**: Set to `false` (removes the "I am a robot" flag).
*   **`navigator.languages`**: Set to realistic values (e.g., `['en-US', 'en']`).
*   **`navigator.plugins`**: Mocked to look like a standard desktop browser.

### 3. WebGL Fingerprinting
Randomizes or standardizes WebGL renderer strings to prevent tracking via GPU fingerprinting.

### 4. Chrome Object Masking
Hides the `window.chrome` object anomalies that betray a headless environment.

## Best Practices for Evasion

1.  **Use Residential Proxies**: IP reputation is 80% of the battle. Use `lambdatestOptions.geoLocation` or pass a proxy URL in your config.
2.  **Human-like Behavior**: Add random delays between actions. Don't click instantly.
3.  **Avoid Parallelism on Same Domain**: Too many concurrent sessions from the same "profile" or IP will trigger rate limits.
4.  **Cookie Persistence**: Re-using cookies (via [Profiles](./profiles.md)) makes you look like a returning user, which is less suspicious than a fresh session.

## Captcha Solving

Sometimes stealth isn't enough. For those cases, use the [Captchas API](./captchas.md).
