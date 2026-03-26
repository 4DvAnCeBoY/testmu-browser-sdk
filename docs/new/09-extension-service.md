# Extension Service

The extension service manages Chrome extensions for cloud browser sessions. Extensions are loaded into LambdaTest browsers via S3 URLs.

## Loading Extensions into a Session

```typescript
const session = await client.sessions.create({
    adapter: 'puppeteer',
    extensionIds: ['ext_abc123'],  // Pre-registered extension IDs
    lambdatestOptions: { ... }
});
```

When `extensionIds` are provided, the session manager fetches the cloud URLs and adds them to the LambdaTest capabilities as `lambda:loadExtension`.

## Registering Extensions

Before using an extension in a session, register it with the service:

```typescript
// Register by cloud URL (pre-uploaded to S3)
const ext = await client.extensions.register({
    name: 'My Extension',
    version: '1.0.0',
    cloudUrl: 'https://s3.amazonaws.com/bucket/extension.zip',
});
console.log(ext.id); // Use this ID in extensionIds
```

## Managing Extensions

```typescript
// List all registered extensions
const extensions = await client.extensions.list();

// Get a specific extension
const ext = await client.extensions.get('ext_abc123');

// Delete an extension
await client.extensions.delete('ext_abc123');
```

## Extension Interface

```typescript
interface Extension {
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    createdAt: string;
    cloudUrl?: string;     // S3 URL for LambdaTest
    localPath?: string;    // Local file path
}
```

## How It Works

1. Extensions are registered with a cloud URL (S3 bucket)
2. When a session is created with `extensionIds`, the service resolves IDs to URLs
3. URLs are added to LambdaTest capabilities under `lambda:loadExtension`
4. LambdaTest downloads and installs the extensions into the browser instance

## Supported Formats

- `.zip` archives containing Chrome extension files
- `.crx` Chrome extension packages

## Current Limitations

- Extension upload to S3 must currently be done manually (via curl or AWS CLI)
- The automated upload API through LambdaTest is not yet integrated
- Extensions only work with cloud sessions on LambdaTest
