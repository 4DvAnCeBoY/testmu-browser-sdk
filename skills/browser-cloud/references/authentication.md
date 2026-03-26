# Authentication

## Credential Resolution Order

The CLI resolves credentials in this priority order (highest to lowest):

1. **CLI flags** — `--username` / `--access-key` on any command
2. **Environment variables** — `LT_USERNAME` and `LT_ACCESS_KEY`
3. **Config file** — `~/.testmuai/config.json`

## Setup

### Interactive

```bash
testmu-browser-cloud setup
# Prompts for username and access key, saves to config file
```

### Non-Interactive

```bash
testmu-browser-cloud setup --username your_username --access-key your_access_key
```

## Config File

Location: `~/.testmuai/config.json`

```json
{
  "username": "your_username",
  "accessKey": "your_access_key"
}
```

The file is created automatically by `setup`. You can also edit it manually.

## Environment Variables

```bash
export LT_USERNAME=your_username
export LT_ACCESS_KEY=your_access_key
```

Useful for shells, scripts, and temporary overrides without modifying the config file.

## CI / Docker Usage

Set environment variables in your CI pipeline or Docker environment:

### GitHub Actions

```yaml
env:
  LT_USERNAME: ${{ secrets.LT_USERNAME }}
  LT_ACCESS_KEY: ${{ secrets.LT_ACCESS_KEY }}
```

### Docker

```dockerfile
ENV LT_USERNAME=your_username
ENV LT_ACCESS_KEY=your_access_key
```

Or pass at runtime:

```bash
docker run -e LT_USERNAME=... -e LT_ACCESS_KEY=... my-image
```

### Per-Command Override

```bash
testmu-browser-cloud scrape https://example.com \
  --username ci_user \
  --access-key ci_key
```
