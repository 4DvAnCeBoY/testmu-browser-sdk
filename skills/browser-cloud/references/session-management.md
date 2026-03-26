# Session Management

## Session Lifecycle

```
Create → Navigate/Interact → Release
```

Sessions are remote cloud browser instances. Always release sessions when done to avoid quota usage.

## Creating a Session

```bash
# Basic session
testmu-browser-cloud session create

# With adapter
testmu-browser-cloud session create --adapter playwright

# With stealth mode
testmu-browser-cloud session create --stealth

# With profile (loads saved cookies/storage)
testmu-browser-cloud session create --profile my-app

# With tunnel (for localhost access)
testmu-browser-cloud session create --tunnel my-tunnel

# With extensions
testmu-browser-cloud session create --extension-ids ext1,ext2

# With custom timeout (seconds)
testmu-browser-cloud session create --timeout 300
```

The command outputs JSON. Extract the session ID:

```bash
SESSION_ID=$(testmu-browser-cloud session create --adapter playwright | jq -r '.data.id')
```

## Session Status

| Status     | Meaning                                      |
|------------|----------------------------------------------|
| `live`     | Session is active and accepting commands     |
| `released` | Session was cleanly terminated               |
| `failed`   | Session encountered an unrecoverable error   |
| `timeout`  | Session exceeded its time limit              |

## Inspecting Sessions

```bash
# List all active sessions
testmu-browser-cloud session list

# Get details for a specific session
testmu-browser-cloud session info <sessionId>
```

## Timeout Behavior

- Default timeout: platform default (typically 300s / 5 minutes)
- Set custom timeout with `--timeout <seconds>`
- Session is automatically released when timeout is reached
- Commands sent to a timed-out session return an error

## Releasing Sessions

```bash
# Release a specific session
testmu-browser-cloud session release <sessionId>

# Release all active sessions (useful for cleanup)
testmu-browser-cloud session release-all
```

## Profile Persistence

Use `--profile` to persist browser state (cookies, localStorage, sessionStorage) across sessions:

```bash
# Session 1: Login and save profile
SESSION=$(testmu-browser-cloud session create --profile my-app | jq -r '.data.id')
# ... perform login actions ...
testmu-browser-cloud profile save my-app --session $SESSION
testmu-browser-cloud session release $SESSION

# Session 2: Resume with saved state (already logged in)
SESSION2=$(testmu-browser-cloud session create --profile my-app | jq -r '.data.id')
```

## Best Practices

- Always release sessions in a `finally` block or trap signal in scripts
- Use `session release-all` in CI teardown steps
- Set explicit timeouts to prevent runaway sessions
- Use profiles to avoid repeated logins
