# Browser Cloud AI Plugin Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Author:** Siraj + Claude

---

## Overview

Add a CLI and Claude Code plugin to `@testmuai/browser-cloud` so AI coding tools (Claude Code, Gemini CLI, Codex, Aider, etc.) can run Puppeteer, Playwright, and Selenium scripts on TestMu Cloud infrastructure.

**Architecture:** Plugin adapter pattern (Approach C) — CLI is the core interface, skills teach AI tools how to use it, and the adapter layer is extensible to future platforms (OpenAI plugin spec, Gemini extensions).

**Distribution model:** Single package (`@testmuai/browser-cloud`). The existing SDK remains unchanged. CLI, skills, and plugin metadata are added alongside it.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| What to expose | High-level tools + script execution (`run`) | Simple ops stay simple, complex automation uses full scripts |
| Authentication | Interactive setup command + env var fallback | Best onboarding UX, env vars for CI/Docker |
| Platforms | Claude Code plugin (skills) + CLI for universal coverage | Skills for first-class Claude Code integration, CLI works everywhere |
| Architecture | Plugin adapter pattern | Extensible to future platforms without rewriting tools |
| Packaging | Same package (`@testmuai/browser-cloud`) | One install, one package — simplest for users |
| CLI name | `testmu-browser-cloud` | Branded, unambiguous |
| Script execution | SDK import required (Option A) | Explicit, reliable. AI tools write the import since SKILL.md teaches them |
| Plugin pattern | agent-browser style (skills + marketplace.json) | Proven pattern, no MCP server needed — CLI via Bash |

---

## Directory Structure

```
browser-cloud/
  .claude-plugin/
    marketplace.json                     # Claude Code marketplace registration

  skills/
    browser-cloud/
      SKILL.md                           # Main skill definition
      references/
        commands.md                      # Full CLI command reference
        authentication.md                # Credential setup, env vars, config
        adapters.md                      # Puppeteer vs Playwright vs Selenium
        stealth.md                       # Stealth mode, fingerprint patching
        session-management.md            # Session lifecycle, context, profiles
        computer-actions.md              # Coordinate-based actions for vision agents
        script-execution.md              # How `run` works, script requirements
        tunnels.md                       # Localhost access from cloud browsers
        files.md                         # Upload/download files
        captcha.md                       # Captcha solving integration
        extensions.md                    # Chrome extensions in cloud sessions
      templates/
        quick-scrape.sh                  # Scrape and output markdown
        authenticated-session.sh         # Login once, save profile, reuse
        run-playwright.sh                # Execute Playwright test on cloud
        vision-agent-loop.sh             # Screenshot -> AI decision -> action loop
        parallel-sessions.sh             # Multiple concurrent sessions

  src/
    index.ts                             # Existing SDK exports (unchanged)
    testmu-cloud/                        # Existing SDK internals (unchanged)
    cli/
      index.ts                           # CLI entrypoint + command router
      commands/
        setup.ts                         # Interactive credential setup
        scrape.ts                        # Quick scrape
        screenshot.ts                    # Quick screenshot
        pdf.ts                           # Quick PDF
        session.ts                       # session create|list|info|release|release-all
        click.ts                         # Computer action: click
        double-click.ts                  # Computer action: double-click
        right-click.ts                   # Computer action: right-click
        type.ts                          # Computer action: type
        key.ts                           # Computer action: key
        scroll.ts                        # Computer action: scroll
        move.ts                          # Computer action: move
        computer-screenshot.ts           # Computer action: screenshot
        run.ts                           # Script execution
        file.ts                          # file upload|download|list|delete
        context.ts                       # context get|set
        profile.ts                       # profile list|save|load|delete
        extension.ts                     # extension register|list|delete
        credential.ts                    # credential add|list|delete
        captcha.ts                       # captcha solve|status
        tunnel.ts                        # tunnel start|stop
        events.ts                        # Session events
        live-details.ts                  # Live session details
      config.ts                          # Config file manager (~/.testmuai/config.json)
      output.ts                          # JSON output formatting

  AGENTS.md                              # Instructions for non-Claude AI tools

  package.json                           # Updated with bin, files
```

---

## Package.json Changes

```json
{
  "bin": {
    "testmu-browser-cloud": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "skills",
    ".claude-plugin",
    "AGENTS.md",
    "README.md",
    "LICENSE"
  ]
}
```

**New dependency:** `commander` for CLI argument parsing.

---

## Claude Code Plugin Manifest

### `.claude-plugin/marketplace.json`

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "browser-cloud",
  "description": "Cloud browser infrastructure for AI agents — run Puppeteer, Playwright, and Selenium on TestMu Cloud",
  "owner": {
    "name": "TestMu AI",
    "email": "support@testmuai.com"
  },
  "plugins": [
    {
      "name": "browser-cloud",
      "description": "Run browser automation scripts on TestMu Cloud. Scrape pages, take screenshots, execute Playwright/Puppeteer/Selenium tests, and drive browsers with computer actions for AI vision agents.",
      "source": "./",
      "strict": false,
      "skills": ["./skills/browser-cloud"],
      "category": "development"
    }
  ]
}
```

---

## Skill Definition

### `skills/browser-cloud/SKILL.md`

```yaml
---
name: browser-cloud
description: >
  Cloud browser automation for AI agents powered by TestMu AI. Use when asked to
  scrape websites, take screenshots, generate PDFs, run Playwright/Puppeteer/Selenium
  scripts on cloud, automate browser interactions, fill forms, test web applications,
  or perform any browser-based task on TestMu Cloud infrastructure.
allowed-tools: Bash(testmu-browser-cloud:*), Bash(npx @testmuai/browser-cloud:*)
---
```

The SKILL.md body contains:
- Setup instructions (first-time credential config)
- Quick actions (scrape, screenshot, pdf — no session needed)
- Session workflow (create -> interact -> release)
- Script execution (`testmu-browser-cloud run`)
- Decision guide (when to use which approach)
- All commands with examples

---

## CLI Command Reference

### Setup
```bash
testmu-browser-cloud setup                          # Interactive
testmu-browser-cloud setup --username X --key Y     # Non-interactive
```

### Quick Actions (no session needed)
```bash
testmu-browser-cloud scrape <url> [--format markdown|html|text]
testmu-browser-cloud screenshot <url> [--full-page] [--format png|jpeg|webp] [--output path]
testmu-browser-cloud pdf <url> [--format A4|Letter] [--output path]
```

### Session Management
```bash
testmu-browser-cloud session create [--adapter puppeteer|playwright|selenium] [--stealth] [--proxy url] [--tunnel] [--profile <id>]
testmu-browser-cloud session list
testmu-browser-cloud session info <id>
testmu-browser-cloud session release <id>
testmu-browser-cloud session release-all
```

### Computer Actions (requires --session)
```bash
testmu-browser-cloud click <x> <y> --session <id>
testmu-browser-cloud double-click <x> <y> --session <id>
testmu-browser-cloud right-click <x> <y> --session <id>
testmu-browser-cloud type <text> --session <id>
testmu-browser-cloud key <key> --session <id>
testmu-browser-cloud scroll <deltaX> <deltaY> --session <id>
testmu-browser-cloud move <x> <y> --session <id>
testmu-browser-cloud computer-screenshot --session <id> [--output path]
```

### Script Execution
```bash
testmu-browser-cloud run <script-path> [--adapter playwright|puppeteer|selenium]
```

Scripts must import `@testmuai/browser-cloud` and use the SDK for session management and cloud connection. The `run` command is a convenience runner that:
1. Loads credentials from config file / env vars
2. Sets `LT_USERNAME` and `LT_ACCESS_KEY` as environment variables for the child process
3. Executes the script via `ts-node` (for .ts) or `node` (for .js)
4. Captures stdout, stderr, and exit code
5. Returns results as JSON

The script itself handles session creation, automation, and cleanup via SDK imports.

### Files
```bash
testmu-browser-cloud file upload <session-id> <local-path>
testmu-browser-cloud file download <session-id> <remote-path> [--output path]
testmu-browser-cloud file list <session-id>
testmu-browser-cloud file delete <session-id> <remote-path>
```

### Context & Profiles
```bash
testmu-browser-cloud context get <session-id> [--output path]
testmu-browser-cloud context set <session-id> <context-json-path>
testmu-browser-cloud profile list
testmu-browser-cloud profile save <name> --session <id>
testmu-browser-cloud profile load <name> --session <id>
testmu-browser-cloud profile delete <name>
```

### Extensions
```bash
testmu-browser-cloud extension register <path-or-url> [--name name]
testmu-browser-cloud extension list
testmu-browser-cloud extension delete <id>
```

### Credentials
```bash
testmu-browser-cloud credential add <url> <username> <password>
testmu-browser-cloud credential list
testmu-browser-cloud credential delete <id>
```

### Captcha
```bash
testmu-browser-cloud captcha solve --session <id> [--type recaptcha|hcaptcha|turnstile]
testmu-browser-cloud captcha status --session <id>
```

### Tunnel
```bash
testmu-browser-cloud tunnel start [--name name]
testmu-browser-cloud tunnel stop
```

### Events
```bash
testmu-browser-cloud events <session-id>
testmu-browser-cloud live-details <session-id>
```

### Output
All commands output JSON by default. Add `--pretty` for human-readable formatting.

---

## Authentication

### Config file location
`~/.testmuai/config.json`

```json
{
  "username": "your_username",
  "accessKey": "your_access_key",
  "defaultAdapter": "playwright",
  "defaultRegion": "us"
}
```

### Resolution order
1. CLI flags (`--username`, `--key`)
2. Environment variables (`LT_USERNAME`, `LT_ACCESS_KEY`)
3. Config file (`~/.testmuai/config.json`)

### Setup command
`testmu-browser-cloud setup` prompts for username and access key, validates them against the TestMu API, and saves to config file.

---

## AGENTS.md (for non-Claude AI tools)

Placed at repo root. Contains the same workflow instructions as SKILL.md but formatted for the AGENTS.md convention. Teaches Gemini CLI, Codex, Aider, and other tools how to use the `testmu-browser-cloud` CLI.

---

## What Stays Unchanged

- The entire `src/testmu-cloud/` directory
- `src/index.ts` exports
- All existing SDK behavior and APIs
- Existing tests
- Library usage pattern (`import { Browser } from '@testmuai/browser-cloud'`)

---

## New Dependency

- `commander` — CLI argument parsing

---

## Testing Strategy

- Unit tests for each CLI command (mock the SDK)
- Integration test for `setup` command (mock filesystem)
- Integration test for `run` command (mock script execution)
- E2E test: `testmu-browser-cloud scrape https://example.com` against real TestMu Cloud (requires credentials)
