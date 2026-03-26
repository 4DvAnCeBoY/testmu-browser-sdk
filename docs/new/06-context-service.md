# Context Service

The context service extracts and injects browser state — cookies, localStorage, and sessionStorage — across sessions. This lets you capture a logged-in state from one session and replay it in another.

## Key Concept

"Context" = cookies + localStorage + sessionStorage for all origins in the browser.

```typescript
interface SessionContext {
    cookies?: Cookie[];
    localStorage?: Record<string, Record<string, string>>;
    sessionStorage?: Record<string, Record<string, string>>;
}
```

## Framework Agnostic

The context service auto-detects whether you pass a Puppeteer `Page` or a Playwright `Page`/`BrowserContext`. The same API works with both.

## Extracting Context

### Get Everything

```typescript
const context = await client.sessions.context(session.id, page);
// or directly:
const context = await client.context.getContext(page);

console.log(context.cookies);        // Array of cookies
console.log(context.localStorage);   // { "origin": { "key": "value" } }
console.log(context.sessionStorage); // { "origin": { "key": "value" } }
```

### Get Individual Parts

```typescript
const cookies = await client.context.getCookies(page);
const localStorage = await client.context.getLocalStorage(page);
const sessionStorage = await client.context.getSessionStorage(page);
```

## Injecting Context

### Set Everything

```typescript
await client.context.setContext(page, {
    cookies: [
        { name: 'session_id', value: 'abc123', domain: '.example.com' }
    ],
    localStorage: {
        'https://example.com': { theme: 'dark', lang: 'en' }
    },
});
```

### Set Individual Parts

```typescript
await client.context.setCookies(page, [
    { name: 'token', value: 'xyz', domain: '.example.com', path: '/' }
]);

await client.context.setLocalStorage(page, {
    'https://example.com': { user: 'john' }
});

await client.context.setSessionStorage(page, {
    'https://example.com': { cart: '[]' }
});
```

## Clearing Context

```typescript
// Clear everything
await client.context.clearContext(page);

// Clear individually
await client.context.clearCookies(page);
await client.context.clearStorage(page);  // Both localStorage and sessionStorage
```

## Real-World Example: Transfer Login Across Sessions

```typescript
// Session 1: Log in and capture state
const session1 = await client.sessions.create({ adapter: 'puppeteer', ... });
const browser1 = await client.puppeteer.connect(session1);
const page1 = (await browser1.pages())[0];

await page1.goto('https://app.example.com/login');
await page1.type('#email', 'user@example.com');
await page1.type('#password', 'password');
await page1.click('#login-button');
await page1.waitForNavigation();

// Capture the logged-in state
const savedContext = await client.context.getContext(page1);
await browser1.close();

// Session 2: Inject saved state (skip login)
const session2 = await client.sessions.create({ adapter: 'puppeteer', ... });
const browser2 = await client.puppeteer.connect(session2);
const page2 = (await browser2.pages())[0];

await client.context.setContext(page2, savedContext);
await page2.goto('https://app.example.com/dashboard');
// You're already logged in!
```

## Cookie Format

```typescript
interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;          // Unix timestamp
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
```

## How It Works

- **Puppeteer**: Uses CDP `Network.getAllCookies` / `Network.setCookie` for cookies, `page.evaluate()` for storage
- **Playwright**: Uses `context.cookies()` / `context.addCookies()` for cookies, `page.evaluate()` for storage
- Framework detection is automatic based on the object's methods
