# Sessions

Sessions are the core abstraction in testMuBrowser. A session represents a single browser instance running on LambdaTest cloud.

## Creating a Session

```typescript
const session = await client.sessions.create({
    adapter: 'puppeteer',         // 'puppeteer' | 'playwright' | 'selenium'
    lambdatestOptions: {
        build: 'My Build',
        name: 'Test Name',
        'LT:Options': {
            username: process.env.LT_USERNAME,
            accessKey: process.env.LT_ACCESS_KEY,
            video: true,
            console: true,
        }
    }
});
```

## SessionConfig Reference

| Option | Type | Description |
|--------|------|-------------|
| `adapter` | `'puppeteer' \| 'playwright'` | Which automation library to use |
| `lambdatestOptions` | `object` | LambdaTest capabilities (build, name, etc.) |
| `stealthConfig` | `StealthConfig` | Enable stealth mode (see [Stealth](./04-stealth-mode.md)) |
| `profileId` | `string` | Load/save persistent profile |
| `proxy` | `string` | Proxy URL |
| `geoLocation` | `string` | Geolocation code (e.g. `'US'`) |
| `tunnel` | `boolean` | Enable LambdaTest tunnel |
| `tunnelName` | `string` | Named tunnel identifier |
| `dimensions` | `{ width, height }` | Browser viewport size |
| `userAgent` | `string` | Custom user-agent string |
| `headless` | `boolean` | Headless mode |
| `timeout` | `number` | Session timeout in ms (default: 300000) |
| `blockAds` | `boolean` | Block ads |
| `solveCaptcha` | `boolean` | Enable CAPTCHA solving |
| `extensionIds` | `string[]` | Chrome extension IDs to load |
| `sessionContext` | `SessionContext` | Pre-load cookies/storage |
| `optimizeBandwidth` | `boolean \| OptimizeBandwidthConfig` | Block images/media/styles |
| `region` | `string` | LambdaTest region |

## Session Object

After creation, you get a Session object:

```typescript
interface Session {
    id: string;                    // Unique session ID
    websocketUrl: string;          // WebSocket URL for adapter connection
    debugUrl: string;              // Debug/dashboard URL
    config: SessionConfig;         // Original config
    status: 'live' | 'released' | 'failed';
    createdAt: string;             // ISO timestamp
    timeout: number;               // Session timeout
    dimensions: Dimensions;        // Viewport dimensions
    sessionViewerUrl?: string;     // LambdaTest live view
    userAgent?: string;            // Resolved user-agent
    stealthConfig?: StealthConfig; // Active stealth config
    // ... more fields
}
```

## Session Lifecycle

```
create() ──> connect() ──> automate ──> browser.close() ──> release()
   │                                                           │
   │  Session is "live"                                        │
   └───────────────────── Session is "released" ───────────────┘
```

### Listing Sessions

```typescript
const sessions = client.sessions.list();
// Returns all active sessions
```

### Retrieving a Session

```typescript
const session = client.sessions.retrieve('session_12345_abc');
```

### Releasing a Session

```typescript
await client.sessions.release(session.id);
// Stops recording, closes browser, cleans up
```

### Releasing All Sessions

```typescript
await client.sessions.releaseAll();
```

## How WebSocket URLs Are Built

For LambdaTest cloud sessions, the SDK constructs the WebSocket URL from your credentials and capabilities:

```
wss://{username}:{accessKey}@cdp.lambdatest.com/{adapter}?capabilities={encoded_json}
```

The `adapter` portion of the path determines which LambdaTest endpoint is used:
- `/puppeteer` for Puppeteer
- `/playwright` for Playwright
- `/selenium` for Selenium

## Additional Session APIs

```typescript
// Extract browser state (cookies, localStorage, sessionStorage)
const context = await client.sessions.context(session.id, page);

// Get live details (open pages, tabs)
const details = await client.sessions.liveDetails(session.id);

// Session-scoped file operations
await client.sessions.files.upload(session.id, buffer, 'file.txt');
const files = await client.sessions.files.list(session.id);
```
