# Computer Actions (Vision Agents)

Computer actions allow AI agents to interact with a cloud browser using screen coordinates — the same way a human would use a mouse and keyboard.

## Requirement

All computer actions require an active session:

```bash
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer | jq -r '.data.id')
```

## Action Types

### Click

```bash
testmu-browser-cloud click <x> <y> --session <id>
```

Single left-click at the given coordinates.

### Double-Click

```bash
testmu-browser-cloud double-click <x> <y> --session <id>
```

Double left-click — useful for opening files or selecting words.

### Right-Click

```bash
testmu-browser-cloud right-click <x> <y> --session <id>
```

Opens context menu at the given coordinates.

### Type

```bash
testmu-browser-cloud type "hello world" --session <id>
```

Types text into the currently focused element.

### Key

```bash
testmu-browser-cloud key Enter --session <id>
testmu-browser-cloud key Tab --session <id>
testmu-browser-cloud key Escape --session <id>
testmu-browser-cloud key "Control+a" --session <id>
testmu-browser-cloud key "Meta+c" --session <id>
```

Presses a named key or key combination.

### Scroll

```bash
testmu-browser-cloud scroll <x> <y> --direction down --amount 300 --session <id>
testmu-browser-cloud scroll <x> <y> --direction up --amount 300 --session <id>
```

Scrolls at the given coordinates. `--amount` is in pixels.

### Move

```bash
testmu-browser-cloud move <x> <y> --session <id>
```

Moves the mouse cursor without clicking (useful for hover effects).

### Screenshot

```bash
testmu-browser-cloud computer-screenshot --session <id>
testmu-browser-cloud computer-screenshot --session <id> --output frame.png
```

Captures the current browser viewport as an image. The primary input for vision-based agents.

## Coordinate System

- Origin `(0, 0)` is the **top-left** corner of the viewport
- X increases to the right, Y increases downward
- Default viewport is typically 1280×720 or 1920×1080

## Example: AI Vision Agent Loop

```bash
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer --stealth | jq -r '.data.id')

# Navigate to target
testmu-browser-cloud scrape https://example.com --session $SESSION_ID

# Capture initial state
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output frame_0.png

# AI model analyzes frame_0.png and determines action:
# "Click the login button at (640, 380)"
testmu-browser-cloud click 640 380 --session $SESSION_ID

# Capture result
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output frame_1.png

# AI model decides next step...
testmu-browser-cloud type "user@example.com" --session $SESSION_ID
testmu-browser-cloud key Tab --session $SESSION_ID
testmu-browser-cloud type "password123" --session $SESSION_ID
testmu-browser-cloud key Enter --session $SESSION_ID

# Cleanup
testmu-browser-cloud session release $SESSION_ID
```

## Tips

- Take a screenshot after each action to confirm state before proceeding
- Use `--stealth` with `humanizeInteractions` to appear more human-like
- Combine with `profile save/load` to skip repeated login flows
