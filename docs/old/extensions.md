# Extensions API

Extensions define the capabilities of the browser. Whether it's an ad-blocker, a crypto wallet, or a custom recorder, injecting extensions is fully supported.

## Supported Formats
*   **Unpacked**: A directory containing `manifest.json`.
*   **.crx**: Packed Chrome Extension files.
*   **.zip**: Zipped extension directory.

## Uploading Extensions

Before using an extension, it must be uploaded/registered with the SDK.

```typescript
import fs from 'fs';

// 1. Read extension file
const extensionBuffer = fs.readFileSync('./ublock-origin.zip');

// 2. Upload to SDK storage
await client.extensions.upload(extensionBuffer, 'ublock.zip');
```

## Using Extensions in a Session

To load an extension, pass its filename in the `extensions` array during session creation.

```typescript
const session = await client.sessions.create({
    extensions: ['ublock.zip', 'react-devtools.crx']
});
```

The Session Manager will automatically:
1.  Extract the extension (if zipped).
2.  Pass the `--load-extension` and `--disable-extensions-except` flags to the browser instance.

## Restrictions
*   **Manifest V2/V3**: Both are supported, but Chrome is phasing out V2. Prefer V3.
*   **LambdaTest**: Extensions on cloud grid require specific capability flags (`loadExtension`). The SDK handles this mapping for you.
