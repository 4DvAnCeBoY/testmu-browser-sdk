# Tunnel Service

The tunnel service creates an encrypted connection between your local machine and LambdaTest's cloud infrastructure. This allows cloud browsers to access `localhost`, internal servers, and private networks.

## Why Use Tunnels?

Without a tunnel, a LambdaTest browser can only access public URLs. With a tunnel:

```
Cloud Browser ──(encrypted tunnel)──> Your Machine ──> localhost:3000
                                                   ──> internal-api.company.com
                                                   ──> 192.168.1.50:8080
```

## Quick Start

### Automatic (via Session Config)

```typescript
const session = await client.sessions.create({
    adapter: 'puppeteer',
    tunnel: true,              // Enable tunnel
    tunnelName: 'my-tunnel',   // Optional: named tunnel
    lambdatestOptions: { ... }
});

const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];
await page.goto('http://localhost:3000');  // Works!
```

### Manual

```typescript
// Start tunnel
await client.tunnel.start({
    user: process.env.LT_USERNAME!,
    key: process.env.LT_ACCESS_KEY!,
    tunnelName: 'my-tunnel',
});

console.log('Tunnel running:', client.tunnel.getStatus()); // true

// Create session that uses the tunnel
const session = await client.sessions.create({
    adapter: 'puppeteer',
    tunnel: true,
    tunnelName: 'my-tunnel',
    lambdatestOptions: { ... }
});

// ... automate ...

// Stop tunnel when done
await client.tunnel.stop();
```

## Tunnel Config

```typescript
interface TunnelConfig {
    user: string;           // LambdaTest username
    key: string;            // LambdaTest access key
    tunnelName?: string;    // Named tunnel for identification
    proxyHost?: string;     // Corporate proxy host
    proxyPort?: string;     // Corporate proxy port
    proxyUser?: string;     // Proxy authentication user
    proxyPass?: string;     // Proxy authentication password
    logFile?: string;       // Log file path
}
```

## API

```typescript
await client.tunnel.start(config);   // Start tunnel
await client.tunnel.stop();          // Stop tunnel
client.tunnel.getStatus();           // Returns boolean
```

## How It Works

- Uses the `@lambdatest/node-tunnel` package under the hood
- Creates a binary tunnel connection to LambdaTest infrastructure
- The tunnel name is passed as a LambdaTest capability so the cloud browser routes through it
- If `tunnel: true` is set in session config without a `tunnelName`, the SDK auto-generates one and auto-starts the tunnel

## Use Cases

- Testing local development servers before deployment
- Accessing staging environments behind a VPN
- Testing with a local API backend
- Accessing internal tools and dashboards
