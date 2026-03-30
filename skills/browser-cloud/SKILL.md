---
name: browser-cloud
description: >
  Cloud browser automation for AI agents powered by TestMu AI. Use when asked to
  scrape websites, take screenshots, generate PDFs, run Playwright/Puppeteer/Selenium
  scripts on cloud, automate browser interactions, fill forms, test web applications,
  or perform any browser-based task on TestMu Cloud infrastructure.
---

# Browser Cloud — TestMu AI

Run browser automation on TestMu Cloud. Supports Puppeteer, Playwright, and Selenium.

## Three Usage Modes

| Mode | Command | Use When |
|------|---------|----------|
| **CLI** | `testmu-browser-cloud <command>` | Terminal, shell scripts, CI/CD |
| **MCP Server** | `testmu-browser-cloud-mcp` | Claude Code / AI agents (30+ browser tools via MCP) |
| **SDK** | `import { Browser } from '@testmuai/browser-cloud'` | Node.js scripts, test suites |

To use as MCP server, add to `~/.claude/settings.json`:

```json
{ "mcpServers": { "browser-cloud": { "command": "testmu-browser-cloud-mcp" } } }
```

## First-Time Setup

```bash
testmu-browser-cloud setup
```

Or with flags:

```bash
testmu-browser-cloud setup --username YOUR_USERNAME --key YOUR_ACCESS_KEY
```

Get credentials at https://www.testmuai.com

## Quick Actions

For simple one-shot operations — no session management needed:

```bash
# Scrape a page as markdown
testmu-browser-cloud scrape https://example.com --format markdown

# Take a screenshot
testmu-browser-cloud screenshot https://example.com --full-page --output page.png

# Generate a PDF
testmu-browser-cloud pdf https://example.com --output page.pdf
```

## Session Workflow

For multi-step browser interactions:

```bash
# 1. Create a session
SESSION_ID=$(testmu-browser-cloud session create --adapter playwright --stealth | jq -r '.data.id')

# 2. Interact with the browser
testmu-browser-cloud click 100 200 --session $SESSION_ID
testmu-browser-cloud type "hello world" --session $SESSION_ID
testmu-browser-cloud key Enter --session $SESSION_ID
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output result.png

# 3. Release when done
testmu-browser-cloud session release $SESSION_ID
```

## Page Service (AI Agent Interaction)

The Page Service is the primary interface for AI agents to interact with web pages using semantic selectors and structured DOM inspection.

```bash
# 1. Create session and navigate
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer | jq -r '.data.id')
testmu-browser-cloud page navigate https://example.com --session $SESSION_ID

# 2. Take a snapshot (get @ref IDs for elements)
testmu-browser-cloud page snapshot --compact --session $SESSION_ID

# 3. Interact using @ref or CSS selectors
testmu-browser-cloud page click "@e5" --session $SESSION_ID
testmu-browser-cloud page fill "#username" "myuser" --session $SESSION_ID
testmu-browser-cloud page select ".dropdown" "option1" --session $SESSION_ID

# 4. Query page state
testmu-browser-cloud page get text ".result" --session $SESSION_ID
testmu-browser-cloud page get url --session $SESSION_ID
testmu-browser-cloud page is visible ".modal" --session $SESSION_ID

# 5. Find elements
testmu-browser-cloud page find role button --session $SESSION_ID
testmu-browser-cloud page find text "Submit" --session $SESSION_ID

# 6. Detect changes
testmu-browser-cloud page snapshot --diff --session $SESSION_ID

# 7. JavaScript evaluation (blocked by default)
testmu-browser-cloud page eval "1+1" --allow-unsafe --session $SESSION_ID
```

Use `--client-id <id>` on any page command for parallel agent isolation (each agent gets its own navigation context). Use `--no-auto-navigate` to skip the automatic reconnection navigation when reattaching to an existing session.

## Running Scripts

Write a standard script using the `@testmuai/browser-cloud` SDK, then run it:

```bash
testmu-browser-cloud run ./my-test.ts --adapter playwright
```

The `run` command sets up credentials automatically. Your script handles session management via SDK imports:

```typescript
import { Browser } from '@testmuai/browser-cloud';

const client = new Browser();
const session = await client.sessions.create({
  adapter: 'playwright',
  stealthConfig: { humanizeInteractions: true },
  lambdatestOptions: {
    build: 'My AI Agent',
    name: 'Test Run',
  }
});

const { browser, page } = await client.playwright.connect(session);
await page.goto('https://example.com');
console.log(await page.title());
await browser.close();
await client.sessions.release(session.id);
```

## Decision Guide

| Task | Command |
|------|---------|
| Quick scrape/screenshot/pdf | `testmu-browser-cloud scrape/screenshot/pdf <url>` |
| AI agent page interaction | Create session → `page navigate` → `page snapshot` → page actions → release |
| Click/fill by semantic ref | `page click "@e5"`, `page fill "#field" "value"` |
| Inspect DOM structure | `page snapshot --compact` (returns @ref IDs) |
| Detect page changes | `page snapshot --diff` |
| Query element state | `page get text/url/title`, `page is visible/enabled` |
| Find elements semantically | `page find role button`, `page find text "Submit"` |
| Multi-step interaction | Create session → computer actions → release |
| Complex automation script | `testmu-browser-cloud run <script>` |
| Need login persistence | Use `--profile <id>` on session create |
| Need stealth mode | Use `--stealth` on session create |
| Need localhost access | Use `--tunnel` on session create |
| Parallel agent isolation | Use `--client-id <id>` on page commands |

## File Operations

```bash
testmu-browser-cloud file upload <session-id> ./document.pdf
testmu-browser-cloud file download <session-id> /downloads/report.csv --output report.csv
testmu-browser-cloud file list <session-id>
```

## Profiles

```bash
testmu-browser-cloud profile save my-login --session $SESSION_ID
testmu-browser-cloud profile load my-login --session $SESSION_ID
testmu-browser-cloud profile list
```

## Tunnel (localhost access)

```bash
testmu-browser-cloud tunnel start --name my-tunnel
# Cloud browser can now access localhost
testmu-browser-cloud tunnel stop
```

## Captcha Solving

```bash
testmu-browser-cloud captcha solve --session $SESSION_ID --type recaptcha
testmu-browser-cloud captcha status --session $SESSION_ID
```

## Extensions

```bash
testmu-browser-cloud extension register https://s3.amazonaws.com/bucket/ext.zip --name "My Extension"
testmu-browser-cloud extension list
```

## Output

All commands output JSON. Use `--pretty` for human-readable format:

```bash
testmu-browser-cloud scrape https://example.com --pretty
```
