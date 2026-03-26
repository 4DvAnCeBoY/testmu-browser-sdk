# Chrome Extensions

Register and load Chrome extensions into cloud browser sessions.

## Register an Extension

Extensions must be registered before they can be loaded into sessions.

### From a URL

```bash
testmu-browser-cloud extension register https://example.com/my-extension.crx
```

### From a Local Path

```bash
testmu-browser-cloud extension register ./extensions/my-extension.crx
testmu-browser-cloud extension register ./extensions/my-extension/   # Unpacked extension directory
```

The command returns an extension ID:

```json
{
  "id": "ext_abc123",
  "name": "My Extension",
  "version": "1.0.0"
}
```

## List Extensions

```bash
testmu-browser-cloud extension list
```

Lists all registered extensions for your account.

## Delete an Extension

```bash
testmu-browser-cloud extension delete <id>
```

Removes the extension from your account. It will no longer be loadable into sessions.

## Loading Extensions into a Session

Pass one or more extension IDs when creating a session:

```bash
testmu-browser-cloud session create \
  --adapter puppeteer \
  --extension-ids ext_abc123,ext_def456
```

The extensions are loaded automatically when the session starts.

## Use Cases

| Use Case | Description |
|----------|-------------|
| Ad blocking | Load uBlock Origin to reduce noise during scraping |
| Cookie management | Auto-accept cookie banners |
| Custom injections | Load a custom extension for DOM manipulation |
| Authentication helpers | Extensions that handle SSO or token injection |
| Proxy management | Extensions that configure proxy settings |

## Notes

- Only Chrome/Chromium-compatible extensions are supported
- Extensions are scoped to your account — not shared across users
- Use unpacked extension directories for development and testing
- Extension IDs are stable across registrations — safe to store in config
