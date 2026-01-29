# Profile Service

The profile service saves browser state (cookies, localStorage, sessionStorage) to disk so it persists across script runs. This is useful for maintaining logged-in sessions without re-authenticating every time.

## Quick Start

```typescript
// Run 1: Log in and save profile
const session = await client.sessions.create({
    adapter: 'puppeteer',
    profileId: 'my-app-login',    // This enables auto-save on close
    ...
});
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

await page.goto('https://app.example.com/login');
// ... log in ...
await browser.close();  // Profile auto-saved!

// Run 2: Skip login
const session2 = await client.sessions.create({
    adapter: 'puppeteer',
    profileId: 'my-app-login',   // Same ID = loads saved state
    ...
});
const browser2 = await client.puppeteer.connect(session2);
const page2 = (await browser2.pages())[0];
await page2.goto('https://app.example.com/dashboard');
// Already logged in!
```

## How It Works

1. When `profileId` is set in session config, the adapter loads the profile from disk on connect
2. The adapter wraps `browser.close()` to auto-save the profile before disconnecting
3. Profiles are stored as JSON files in `.profiles/` directory

## Profile File Format

Profiles are saved at `.profiles/{profileId}.json`:

```json
{
    "id": "my-app-login",
    "cookies": [
        {
            "name": "session_token",
            "value": "abc123...",
            "domain": ".example.com",
            "path": "/",
            "expires": 1735689600,
            "httpOnly": true,
            "secure": true
        }
    ],
    "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Manual Profile Management

You can also manage profiles directly through the profile service:

```typescript
// Save profile manually
await client.profiles.saveProfile('my-profile', page, { note: 'after login' });

// Load profile manually
await client.profiles.loadProfile('my-profile', page);

// List all profiles
const profiles = await client.profiles.listProfiles();

// Delete a profile
await client.profiles.deleteProfile('my-profile');
```

## Difference from Context Service

| | Context Service | Profile Service |
|---|---|---|
| **Storage** | In-memory (returned as object) | Persisted to disk (JSON files) |
| **Lifetime** | Single script run | Across multiple runs |
| **Use case** | Transfer state between sessions in the same script | Maintain login across days/weeks |
| **Trigger** | Manual `getContext()` / `setContext()` | Automatic via `profileId` config |

## Works With Both Adapters

- **Puppeteer**: Saves/loads cookies via CDP page methods
- **Playwright**: Saves/loads cookies via `context.addCookies()` / `context.cookies()`

## Security Note

Profile files contain session cookies and tokens in plain text. Do not commit `.profiles/` to version control. The `.gitignore` should include:

```
.profiles/
```
