# TestMu Browser Cloud CLI

Command-line tool for running browser automation on TestMu Cloud (LambdaTest). Works standalone or as a Claude Code plugin.

## Installation

### As Claude Code Plugin

```bash
claude plugin marketplace add 4DvAnCeBoY/testmu-browser-sdk
claude plugin install browser-cloud
```

On first session start, you'll be prompted to configure credentials automatically.

### As Global CLI

```bash
npm install -g @testmuai/browser-cloud
testmu-browser-cloud setup
```

### As Project Dependency

```bash
npm install @testmuai/browser-cloud
npx testmu-browser-cloud setup
```

## Authentication

```bash
# Interactive setup
testmu-browser-cloud setup

# Non-interactive
testmu-browser-cloud setup --username YOUR_USERNAME --key YOUR_ACCESS_KEY
```

Credentials are resolved in order: CLI flags > environment variables (`LT_USERNAME`, `LT_ACCESS_KEY`) > config file (`~/.testmuai/config.json`).

Get credentials at [testmuai.com](https://www.testmuai.com).

## Quick Actions

One-shot operations — no session management needed.

```bash
# Scrape a webpage as markdown
testmu-browser-cloud scrape https://www.lambdatest.com/pricing --format markdown

# Scrape as plain text
testmu-browser-cloud scrape https://playwright.dev/docs/intro --format text

# Scrape with readability extraction
testmu-browser-cloud scrape https://dev.to --format readability

# Wait for a specific element before scraping
testmu-browser-cloud scrape https://news.ycombinator.com --format text --wait-for .titleline

# Take a screenshot
testmu-browser-cloud screenshot https://www.testmuai.com --full-page --output homepage.png

# Screenshot as JPEG
testmu-browser-cloud screenshot https://github.com --format jpeg --output github.jpg

# Generate a PDF
testmu-browser-cloud pdf https://news.ycombinator.com --output news.pdf

# PDF in landscape Letter format
testmu-browser-cloud pdf https://github.com/trending --format Letter --landscape --output trending.pdf
```

## Run Existing Scripts on Cloud

Run your existing Puppeteer, Playwright, or Selenium scripts on LambdaTest cloud **with zero code changes**. The CLI auto-detects which adapter your script uses and transparently patches `launch()` to connect to the cloud.

```bash
# Playwright script
testmu-browser-cloud run my-playwright-test.js

# Puppeteer script with specific platform
testmu-browser-cloud run scraper.js --platform-name "Windows 11" --browser-name Chrome

# Selenium script with build name
testmu-browser-cloud run selenium-suite.js --build "CI Run #42" --name "Regression"

# Force a specific adapter
testmu-browser-cloud run test.js --adapter playwright

# Run in headless mode
testmu-browser-cloud run test.js --headless
```

**How it works:** The CLI reads your script, detects `require('playwright')` / `require('puppeteer')` / `require('selenium-webdriver')`, generates a preload that patches `launch()` → `connect(cloudEndpoint)`, and runs via `node --require preload.js your-script.js`.

Scripts using `@testmuai/browser-cloud` SDK are detected and run directly with credentials injected.

### Run Command Options

| Flag | Description | Default |
|------|-------------|---------|
| `--adapter` | Force adapter: puppeteer, playwright, selenium | Auto-detected |
| `--platform-name` | OS: "Windows 11", "macOS Sonoma" | Windows 10 |
| `--browser-name` | Browser: Chrome, MicrosoftEdge, pw-firefox, pw-webkit | Chrome |
| `--browser-version` | Version: "latest", "120" | latest |
| `--build` | Build name for LambdaTest dashboard | testmu-browser-cloud run |
| `--name` | Test name for dashboard | Script filename |
| `--headless` | Run in headless mode | headed |

### Playwright Browser Names on LambdaTest

| Browser | `--browser-name` value |
|---------|----------------------|
| Chrome | `chrome` |
| Edge | `MicrosoftEdge` |
| Chromium | `pw-chromium` |
| Firefox | `pw-firefox` |
| WebKit/Safari | `pw-webkit` |

## Session Workflow

For multi-step browser interactions using computer actions.

```bash
# Create a session
SESSION_ID=$(testmu-browser-cloud session create \
  --adapter playwright \
  --stealth \
  --platform-name "Windows 11" \
  --browser-name Chrome \
  --build "My Test" | jq -r '.data.id')

# Interact with the browser
testmu-browser-cloud click 100 200 --session $SESSION_ID
testmu-browser-cloud type "search query" --session $SESSION_ID
testmu-browser-cloud key Enter --session $SESSION_ID
testmu-browser-cloud scroll 0 500 --session $SESSION_ID

# Take a screenshot
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output result.png

# Release
testmu-browser-cloud session release $SESSION_ID
```

### Session Create Options

| Flag | Description |
|------|-------------|
| `--adapter` | puppeteer, playwright, selenium |
| `--stealth` | Enable stealth mode (fingerprint patching) |
| `--proxy <url>` | Proxy URL |
| `--tunnel` | Enable tunnel for localhost access |
| `--tunnel-name <name>` | Named tunnel |
| `--profile <id>` | Persistent browser profile |
| `--headless` | Headless mode |
| `--region` | Cloud region |
| `--timeout <ms>` | Session timeout |
| `--session-context <path>` | Restore auth context from JSON |
| `--credentials` | Enable auto-fill credentials |
| `--platform-name` | OS platform |
| `--browser-name` | Browser |
| `--browser-version` | Version |
| `--device-name` | Mobile device |
| `--build` | Build name |
| `--name` | Session name |

## File Operations

```bash
testmu-browser-cloud file upload <session-id> ./document.pdf
testmu-browser-cloud file download <session-id> /downloads/report.csv --output report.csv
testmu-browser-cloud file list <session-id>
testmu-browser-cloud file delete <session-id> /path/to/file
testmu-browser-cloud file delete-all <session-id>
testmu-browser-cloud file download-archive <session-id> --output files.zip
```

## Profiles

```bash
testmu-browser-cloud profile list
testmu-browser-cloud profile save my-login --session $SESSION_ID
testmu-browser-cloud profile load my-login --session $SESSION_ID
testmu-browser-cloud profile delete my-login
testmu-browser-cloud profile export my-login --output profile.json
testmu-browser-cloud profile import profile.json
```

## Context (Cookies/Storage)

```bash
testmu-browser-cloud context get <session-id> --output auth-state.json
testmu-browser-cloud context set <session-id> auth-state.json
testmu-browser-cloud context clear <session-id>
```

## Credentials

```bash
testmu-browser-cloud credential add https://github.com myuser mypass
testmu-browser-cloud credential list
testmu-browser-cloud credential get <id>
testmu-browser-cloud credential find https://github.com
testmu-browser-cloud credential delete <id>
```

## Extensions

```bash
testmu-browser-cloud extension register https://s3.amazonaws.com/bucket/ext.zip --name "Ad Blocker"
testmu-browser-cloud extension register ./local-extension.zip --name "Dev Tools"
testmu-browser-cloud extension list
testmu-browser-cloud extension delete <id>
```

## Captcha

```bash
testmu-browser-cloud captcha solve --session $SESSION_ID --type recaptcha
testmu-browser-cloud captcha status --session $SESSION_ID
```

## Tunnel

```bash
testmu-browser-cloud tunnel start --name my-tunnel
testmu-browser-cloud tunnel status
testmu-browser-cloud tunnel stop
```

## Events

```bash
testmu-browser-cloud events <session-id>
testmu-browser-cloud live-details <session-id>
```

## Output Format

All commands output JSON to stdout. Errors go to stderr.

```bash
# Compact JSON (default)
testmu-browser-cloud scrape https://playwright.dev --format text

# Pretty-printed JSON
testmu-browser-cloud --pretty scrape https://playwright.dev --format text

# Parse with jq
testmu-browser-cloud scrape https://playwright.dev --format text | jq '.data.title'
```

Success response:
```json
{"success": true, "data": { ... }}
```

Error response (stderr):
```json
{"success": false, "error": "message"}
```

## Security

- Access keys are automatically redacted from CLI JSON output
- Credentials stored in `~/.testmuai/config.json` with user-only permissions
- WebSocket URLs in output have access keys masked as `****`

## For AI Tools

This CLI is designed to be used by AI coding tools:
- **Claude Code**: Install as plugin (see above)
- **Gemini CLI, Codex, Aider**: See [AGENTS.md](AGENTS.md)
- All commands return structured JSON for programmatic parsing
- Error codes and messages are consistent across all commands
