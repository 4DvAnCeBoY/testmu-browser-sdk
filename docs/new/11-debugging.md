# Debugging

## LambdaTest Dashboard

Every cloud session appears on the LambdaTest Automation Dashboard:

```
https://automation.lambdatest.com/logs/
```

From the dashboard you can:
- Watch live video of the browser
- View console logs
- See network requests
- Check screenshots
- Review test results (pass/fail)

### Naming Your Tests

Use `build` and `name` in `lambdatestOptions` to organize tests:

```typescript
const session = await client.sessions.create({
    lambdatestOptions: {
        build: 'Sprint 42 - Login Tests',
        name: 'Verify SSO Login',
        'LT:Options': {
            video: true,     // Record video
            console: true,   // Capture console logs
        }
    }
});
```

## Debug URL

Every session has a `debugUrl` you can open in a browser:

```typescript
console.log(session.debugUrl);
// https://automation.lambdatest.com/logs/
```

## Session Viewer

```typescript
console.log(session.sessionViewerUrl);
```

The session viewer provides a live stream of the cloud browser.

## SDK Console Output

The SDK logs connection steps, profile operations, and stealth actions to stdout:

```
Adapter: Connecting to session session_123_abc via Puppeteer...
Adapter: Set stealth user-agent: Mozilla/5.0 (Windows NT 10.0...
Adapter: Set stealth viewport: 1907x1063
Adapter: Humanized interactions enabled
Adapter: Loading profile my-app-login
```

## Common Issues

### Connection Timeout

```
Error: Timed out after 30000ms while waiting for the WebSocket
```

**Causes:**
- Invalid LT_USERNAME or LT_ACCESS_KEY
- LambdaTest service is down
- Network firewall blocking WebSocket connections

**Fix:** Verify credentials, check LambdaTest status page, try a different network.

### Session Not Found

```
Session session_xyz not found
```

**Cause:** Session was already released or timed out.

**Fix:** Sessions have a default 5-minute timeout. Increase with `timeout: 600000` (10 minutes) in session config.

### Playwright Requires Node 18+

```
Playwright requires Node.js 18 or higher.
```

**Fix:** Upgrade Node.js to 18+. Use `nvm install 18 && nvm use 18`.

### Profile Not Loading

**Cause:** Profile file doesn't exist yet (first run).

**Fix:** This is normal. On first run, the profile is created when `browser.close()` is called. Subsequent runs will load it.

## Live Session Details

```typescript
const details = await client.sessions.liveDetails(session.id);
console.log(details.pages);            // Open pages/tabs
console.log(details.wsUrl);            // WebSocket URL
console.log(details.sessionViewerUrl); // Live viewer
```
