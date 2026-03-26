# CLI Command Reference

## Setup

```bash
testmu-browser-cloud setup                        # Interactive credential setup
testmu-browser-cloud setup --username <u> --access-key <k>  # Non-interactive
```

## Scrape & Capture

```bash
testmu-browser-cloud scrape <url>                 # Scrape page content
testmu-browser-cloud scrape <url> --format markdown|html|text
testmu-browser-cloud scrape <url> --selector <css>
testmu-browser-cloud scrape <url> --wait <ms>

testmu-browser-cloud screenshot <url>             # Capture screenshot
testmu-browser-cloud screenshot <url> --output <file>
testmu-browser-cloud screenshot <url> --full-page
testmu-browser-cloud screenshot <url> --width <px> --height <px>

testmu-browser-cloud pdf <url>                    # Export page as PDF
testmu-browser-cloud pdf <url> --output <file>
testmu-browser-cloud pdf <url> --format A4|Letter
testmu-browser-cloud pdf <url> --landscape
```

## Session Management

```bash
testmu-browser-cloud session create               # Create new session
testmu-browser-cloud session create --adapter puppeteer|playwright|selenium
testmu-browser-cloud session create --stealth
testmu-browser-cloud session create --profile <name>
testmu-browser-cloud session create --tunnel <name>
testmu-browser-cloud session create --extension-ids <id1,id2>
testmu-browser-cloud session create --timeout <seconds>

testmu-browser-cloud session list                 # List all sessions
testmu-browser-cloud session info <sessionId>     # Session details
testmu-browser-cloud session release <sessionId>  # Release one session
testmu-browser-cloud session release-all          # Release all sessions
```

## Computer Actions (Vision Agents)

```bash
testmu-browser-cloud click <x> <y> --session <id>
testmu-browser-cloud double-click <x> <y> --session <id>
testmu-browser-cloud right-click <x> <y> --session <id>
testmu-browser-cloud type "<text>" --session <id>
testmu-browser-cloud key <key> --session <id>     # e.g. Enter, Tab, Escape
testmu-browser-cloud scroll <x> <y> --direction up|down --amount <px> --session <id>
testmu-browser-cloud move <x> <y> --session <id>
testmu-browser-cloud computer-screenshot --session <id>
testmu-browser-cloud computer-screenshot --session <id> --output <file>
```

## Script Execution

```bash
testmu-browser-cloud run <script>                 # Run a local script
testmu-browser-cloud run <script> --adapter puppeteer|playwright|selenium
testmu-browser-cloud run <script> --env KEY=VALUE
```

## File Operations

```bash
testmu-browser-cloud file upload <localPath> --session <id>
testmu-browser-cloud file download <remoteFile> --session <id> --output <localPath>
testmu-browser-cloud file list --session <id>
testmu-browser-cloud file delete <remoteFile> --session <id>
```

## Context

```bash
testmu-browser-cloud context get --session <id>
testmu-browser-cloud context set <key> <value> --session <id>
```

## Profiles

```bash
testmu-browser-cloud profile list
testmu-browser-cloud profile save <name> --session <id>
testmu-browser-cloud profile load <name> --session <id>
testmu-browser-cloud profile delete <name>
```

## Extensions

```bash
testmu-browser-cloud extension register <url|path>
testmu-browser-cloud extension list
testmu-browser-cloud extension delete <id>
```

## Credentials

```bash
testmu-browser-cloud credential add <key> <value>
testmu-browser-cloud credential list
testmu-browser-cloud credential delete <key>
```

## Captcha

```bash
testmu-browser-cloud captcha solve --session <id>
testmu-browser-cloud captcha solve --type recaptcha|hcaptcha|turnstile --session <id>
testmu-browser-cloud captcha status <taskId>
```

## Tunnels

```bash
testmu-browser-cloud tunnel start
testmu-browser-cloud tunnel start --name <name>
testmu-browser-cloud tunnel stop
testmu-browser-cloud tunnel stop --name <name>
```

## Events & Live Details

```bash
testmu-browser-cloud events --session <id>        # Stream session events
testmu-browser-cloud live-details --session <id>  # Live session metadata
```
