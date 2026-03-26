# Bring Your Own Browser (BYOB)

testMuBrowser is typically used to launch *new* sessions on LambdaTest or locally. However, advanced users often need to attach to an **existing** Chrome instance (e.g., one started by another tool, or a persistent local browser).

## Connecting to an Existing Browser

You can pass the `customWebSocketUrl` parameter to `client.sessions.create()`.

```typescript
// 1. You already have a running browser with a known WS Endpoint
const existingWebSocketUrl = 'ws://127.0.0.1:9222/devtools/browser/abc-123';

// 2. Connect testMuBrowser to it
const session = await client.sessions.create({
    customWebSocketUrl: existingWebSocketUrl
});

// 3. Use it with any adapter
const browser = await client.puppeteer.connect(session);
// ... do automation ...
```

### Use Cases
*   **Debug Mode**: Connect to a browser you manually launched with `--remote-debugging-port=9222`.
*   **Mixed Infrastructure**: Use testMuBrowser's Profile/Stealth features on top of a generic Selenium Grid session.
*   **Reconnection**: Reconnect to a "detached" session if you stored the WebSocket URL.

## Session Management

You can now manage your active sessions via the client.

```typescript
// List all active sessions (Local, Cloud, or Custom)
const activeSessions = client.sessions.list();
console.log(activeSessions); 
// [{ id: 'session_123', websocketUrl: '...' }]

// Retrieve a specific session
const session = client.sessions.retrieve('session_123');
```
