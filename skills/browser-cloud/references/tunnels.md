# Tunnels

Tunnels expose your local development server to the cloud browser, enabling automation of `localhost` or `192.168.x.x` URLs from a remote session.

## Starting a Tunnel

```bash
# Start default tunnel
testmu-browser-cloud tunnel start

# Start a named tunnel (allows multiple simultaneous tunnels)
testmu-browser-cloud tunnel start --name my-tunnel
```

The tunnel remains active until explicitly stopped or the process exits.

## Stopping a Tunnel

```bash
# Stop default tunnel
testmu-browser-cloud tunnel stop

# Stop a named tunnel
testmu-browser-cloud tunnel stop --name my-tunnel
```

## Using a Tunnel in a Session

Pass the tunnel name when creating a session. The cloud browser will route traffic through that tunnel.

```bash
# Start tunnel
testmu-browser-cloud tunnel start --name dev-tunnel

# Create session that uses the tunnel
SESSION_ID=$(testmu-browser-cloud session create --adapter playwright --tunnel dev-tunnel | jq -r '.data.id')

# Now you can access localhost URLs from the cloud browser
testmu-browser-cloud scrape http://localhost:3000 --session $SESSION_ID

# Cleanup
testmu-browser-cloud session release $SESSION_ID
testmu-browser-cloud tunnel stop --name dev-tunnel
```

## Named Tunnels

Named tunnels allow you to run multiple tunnels simultaneously — useful for:

- Testing multiple local services at once
- Parallel CI jobs each with their own tunnel
- Different environments (dev, staging) accessed from the same machine

```bash
testmu-browser-cloud tunnel start --name frontend   # localhost:3000
testmu-browser-cloud tunnel start --name backend    # localhost:8080
```

Each session references its tunnel by name:

```bash
testmu-browser-cloud session create --tunnel frontend
testmu-browser-cloud session create --tunnel backend
```

## CI Usage

In CI pipelines, start the tunnel before your test suite and stop it in the teardown step:

```bash
# Setup
testmu-browser-cloud tunnel start --name ci-tunnel

# Run tests
testmu-browser-cloud run ./tests/e2e.ts

# Teardown
testmu-browser-cloud tunnel stop --name ci-tunnel
testmu-browser-cloud session release-all
```
