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

### Page Service (AI Agent Browser Interaction)

Use the `page` subcommand to interact with a live session via the accessibility tree. This is the recommended interface for AI agents — no screenshots or pixel coordinates needed.

#### Snapshot

```bash
# Capture accessibility tree with @ref element IDs
testmu-browser-cloud page snapshot --session $SESSION_ID

# Show only changes since the last snapshot
testmu-browser-cloud page snapshot --diff --session $SESSION_ID

# Compact / token-efficient output
testmu-browser-cloud page snapshot --compact --session $SESSION_ID
```

#### Interaction

```bash
testmu-browser-cloud page click @e12 --session $SESSION_ID
testmu-browser-cloud page fill @e5 "user@example.com" --session $SESSION_ID
testmu-browser-cloud page type @e5 "hello world" --session $SESSION_ID
testmu-browser-cloud page select @e8 "option-value" --session $SESSION_ID
testmu-browser-cloud page check @e3 --session $SESSION_ID
testmu-browser-cloud page hover @e7 --session $SESSION_ID
testmu-browser-cloud page press "Enter" --session $SESSION_ID
testmu-browser-cloud page scroll down 300 --session $SESSION_ID
testmu-browser-cloud page scroll @e4 right 200 --session $SESSION_ID
testmu-browser-cloud page wait "#modal" --session $SESSION_ID
testmu-browser-cloud page wait 2000 --session $SESSION_ID
```

#### Queries

```bash
testmu-browser-cloud page get text @e10 --session $SESSION_ID
testmu-browser-cloud page get html @e10 --session $SESSION_ID
testmu-browser-cloud page get value @e5 --session $SESSION_ID
testmu-browser-cloud page get attr @e10 href --session $SESSION_ID
testmu-browser-cloud page get url --session $SESSION_ID
testmu-browser-cloud page get title --session $SESSION_ID
```

#### State Checks

```bash
testmu-browser-cloud page is visible @e4 --session $SESSION_ID
testmu-browser-cloud page is enabled @e8 --session $SESSION_ID
testmu-browser-cloud page is checked @e3 --session $SESSION_ID
```

#### Find

```bash
testmu-browser-cloud page find role button --session $SESSION_ID
testmu-browser-cloud page find text "Sign in" --session $SESSION_ID
testmu-browser-cloud page find label "Email address" --session $SESSION_ID
```

#### JavaScript Evaluation (opt-in only)

`eval` is blocked by default. You must pass `--allow-unsafe` to run scripts:

```bash
testmu-browser-cloud page eval "document.title" --allow-unsafe --session $SESSION_ID
```

#### Parallel Session Isolation (--client-id)

When multiple agents share a session, use `--client-id` to keep ref maps and snapshots separate:

```bash
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id agent-1
testmu-browser-cloud page click @e12  --session $SESSION_ID --client-id agent-1
```

Without `--client-id`, each process gets an auto-generated default (`cli-{pid}`).

#### Session Reconnection

The page service saves the last URL to disk. The next process reconnects and auto-navigates to that URL automatically. To disable this:

```bash
testmu-browser-cloud page snapshot --session $SESSION_ID --no-auto-navigate
```

### All Commands

Run `testmu-browser-cloud --help` for the full command list.

### Output Format

All commands return JSON. Use `--pretty` for human-readable output.
