# Credentials API (Mock)

Managing sensitive credentials (usernames, passwords, API keys) securely is a critical part of building safe Agents. Hardcoding passwords in scripts is a security anti-pattern.

**testMuBrowser** provides a **Credentials API** to decouple secret management from agent logic.

> [!NOTE]
> Currently, this is a **Mock Implementation** (In-Memory). In a real production environment, this should back onto a secure vault like AWS Secrets Manager or HashiCorp Vault.

## Concept

Your Agent requests credentials by a `slug` or `namespace`, rather than raw values.

```typescript
// BAD:
await page.type('#password', 'SuperSecret123');

// GOOD:
const creds = client.credentials.get('github-production');
await page.type('#password', creds.password);
```

## Setup

Pre-load credentials into the store at application startup.

```typescript
// In your initialization script
await client.credentials.create('gmail-bot-1', {
    username: 'bot_alice@gmail.com',
    password: process.env.BOT_PASSWORD, // Loaded from ENV
    recoveryEmail: 'admin@company.com'
});
```

## Usage in Session

```typescript
const session = await client.sessions.create();
// ... navigate ...

// Retrieve credentials safely
const { username, password } = client.credentials.get('gmail-bot-1');

await page.type('#email', username);
await page.type('#password', password);
```
