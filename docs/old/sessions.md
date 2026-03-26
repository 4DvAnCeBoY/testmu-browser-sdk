# Sessions API

The **Sessions API** is the heart of `testMuBrowser`. It handles the orchestration, lifecycle management, and connection details for your browser environments.

## Creating a Session

To create a new browser session, use the `client.sessions.create(config)` method. This method is asynchronous and returns a `Session` object.

```typescript
const session = await client.sessions.create({
    stealth: true,
    local: false,
    profileId: 'user-123',
    // Steel Parity Options
    proxy: 'http://username:password@proxy-host:port',
    geoLocation: 'US',
    
    // Advanced Configuration
    lambdatestOptions: { ... }
});
```

### Configuration Options (`SessionConfig`)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `local` | `boolean` | `false` | If `true`, launches a local Chrome instance. If `false`, connects to LambdaTest. |
| `stealth` | `boolean` | `false` | Enables sophisticated anti-fingerprinting patches (WebGL, UserAgent, etc.). |
| `profileId` | `string` | `undefined` | The ID of a profile to load (cookies/storage). If provided, state is saved on exit. |
| `proxy` | `string` | `undefined` | Proxy URL (`http://...` or `socks5://...`). Maps to LambdaTest Proxy/Geo. |
| `geoLocation` | `string` | `undefined` | Country code (e.g., `US`, `EU`, `IN`) for IP geolocation. |
| `tunnel` | `boolean` | `false` | Enable LambdaTest Tunnel (requires local binary). |
| `tunnelName` | `string` | `undefined` | Optional name of the running tunnel. |
| `lambdatestOptions` | `object` | `{}` | Detailed configuration passed specifically to LambdaTest Capabilities. |

### LambdaTest Options

You can pass any valid [LambdaTest Capability](https://www.lambdatest.com/capabilities-generator/) via `lambdatestOptions`.

```typescript
lambdatestOptions: {
    build: 'AI Agent Production',
    name: 'Customer Service Bot',
    platformName: 'Windows 10',
    browserVersion: 'latest',
    console: true, // Capture console logs
    network: true  // Capture network logs
}
```

## Session Object

The `Session` object contains everything you need to connect your automation framework.

```typescript
interface Session {
    id: string;          // Unique Session ID (UUID)
    websocketUrl: string; // The CDP WebSocket Endpoint (wss://...)
    debugUrl: string;     // URL to the Live Video/Logs (LambdaTest Dashboard)
    config: SessionConfig; // The configuration used to create this session
}
```

## Session Lifecycle

It is crucial to manage the lifecycle of a session to avoid resource leaks (zombie browsers) and ensure data persistence.

### Releasing a Session

You **MUST** call `client.sessions.release(sessionId)` when your work is done.

```typescript
try {
    // ... work ...
} finally {
    await client.sessions.release(session.id);
}
```

## Debugging Sessions

Every session comes with a `debugUrl`.
*   **LambdaTest**: Points to the **Automation Dashboard** (Video, Logs, Terminal).
*   **Local**: Points to `http://localhost:9222`.
