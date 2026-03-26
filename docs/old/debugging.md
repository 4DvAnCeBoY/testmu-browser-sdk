# Debugging & Monitoring

Debugging headless browsers is notoriously difficult. **testMuBrowser** leverages LambdaTest's observability tools to make this easier.

## 1. Live Interactive View

When running on LambdaTest, every session generates a `debugUrl`.

```typescript
console.log(session.debugUrl);
// Output: https://automation.lambdatest.com/logs/...
```

Opening this URL gives you:
*   A **Live Video Feed** of the browser execution.
*   Ability to **Intervene** (click/type manually) if the agent gets stuck.
*   **Network Logs** (Performance > Network) to see failed API calls.
*   **Console Logs** from the browser's DevTools.

## 2. Local Debugging

If running with `local: true`:

```typescript
const session = await client.sessions.create({ local: true });
```

The browser will launch in **Headful** mode (visible UI) by default, or you can connect Chrome DevTools to `http://localhost:9222`.

## 3. Logs

### SDK Logs
Enable verbose logging by setting the environment variable:

```bash
export DEBUG=testMuBrowser:*
```

### Browser Console Logs
You can capture browser console output programmatically via your framework adapter.

**Puppeteer Example:**
```typescript
page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
```

## Common Issues & Fixes

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **TimeoutError** | Page took too long to load | Increase timeout or use `waitUntil: 'domcontentloaded'` instead of `networkidle`. |
| **403 Forbidden** | Bot detection triggered | Enable `stealth: true`, rotate User-Agent, or use a better proxy. |
| **Element Not Found** | Dynamic content/SPA | Use `page.waitForSelector()` before clicking. Don't rely on hard waits. |
| **Profile Not Saved** | Session crashed | Ensure you call `client.sessions.release()` in a `finally` block. |
