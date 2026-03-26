# Browser Cloud — AI Agent Instructions

This package provides `testmu-browser-cloud`, a CLI for running browser automation on TestMu Cloud.

## Installation

```bash
npm install -g @testmuai/browser-cloud
```

## Setup

```bash
testmu-browser-cloud setup
```

## Usage

### Quick Actions (no session needed)

```bash
testmu-browser-cloud scrape <url> --format markdown
testmu-browser-cloud screenshot <url> --full-page --output shot.png
testmu-browser-cloud pdf <url> --output page.pdf
```

### Session Workflow (multi-step)

```bash
SESSION_ID=$(testmu-browser-cloud session create --adapter playwright --stealth | jq -r '.data.id')
testmu-browser-cloud click 100 200 --session $SESSION_ID
testmu-browser-cloud type "hello" --session $SESSION_ID
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output result.png
testmu-browser-cloud session release $SESSION_ID
```

### Run Scripts

```bash
testmu-browser-cloud run ./my-test.ts --adapter playwright
```

Scripts must import `@testmuai/browser-cloud` and use the SDK for session management.

### All Commands

Run `testmu-browser-cloud --help` for the full command list.

### Output Format

All commands return JSON. Use `--pretty` for human-readable output.
