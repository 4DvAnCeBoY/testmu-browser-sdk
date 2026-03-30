# Page Service

The Page Service gives AI agents structured, accessible control over a live browser session. Instead of pixel coordinates or screenshots, agents work with an accessibility-tree snapshot that assigns stable `@ref` IDs to every interactive element. Those IDs are valid across all page commands within the same client scope.

## Core Concept: Snapshots & Refs

A snapshot captures the page's accessibility tree and labels each element with a short `@ref` identifier (e.g. `@e3`, `@e12`). Pass a ref wherever a selector is accepted.

```typescript
const snapshot = await client.page.snapshot(session.id);
// snapshot.tree contains elements with ref IDs
// e.g. button[@e12] "Sign in"
```

Use the same ref immediately in follow-up commands:

```typescript
await client.page.click(session.id, '@e12');
```

Refs are stable for the lifetime of a snapshot. After navigating or after the page mutates significantly, take a new snapshot.

---

## Snapshot

### Full Snapshot

```bash
testmu-browser-cloud page snapshot --session $SESSION_ID
```

```typescript
const snapshot = await client.page.snapshot(session.id);
```

Returns the full accessibility tree with `@ref` IDs on each element.

### Diff — Changes Since Last Snapshot

```bash
testmu-browser-cloud page snapshot --diff --session $SESSION_ID
```

```typescript
const diff = await client.page.snapshot(session.id, { diff: true });
```

Returns only the elements that changed since the previous snapshot call. The previous snapshot is persisted to disk (`prev-snapshot.{clientId}.json`) so diffs survive process restarts.

### Compact Output

```bash
testmu-browser-cloud page snapshot --compact --session $SESSION_ID
```

```typescript
const compact = await client.page.snapshot(session.id, { compact: true });
```

Returns a condensed plain-text representation. Useful when token budget is tight.

---

## Interaction Commands

All interaction commands accept either a `@ref` ID from a snapshot or a CSS selector string.

### click

```bash
testmu-browser-cloud page click @e12 --session $SESSION_ID
testmu-browser-cloud page click "#submit-btn" --session $SESSION_ID
```

```typescript
await client.page.click(session.id, '@e12');
```

### fill

Clears an input and sets its value in one step. Best for form fields.

```bash
testmu-browser-cloud page fill @e5 "user@example.com" --session $SESSION_ID
```

```typescript
await client.page.fill(session.id, '@e5', 'user@example.com');
```

### type

Types text character by character, dispatching key events. Use when an input relies on `keydown`/`keyup` handlers.

```bash
testmu-browser-cloud page type @e5 "hello world" --session $SESSION_ID
```

```typescript
await client.page.type(session.id, '@e5', 'hello world');
```

### select

Selects an option in a `<select>` element by value.

```bash
testmu-browser-cloud page select @e8 "option-value" --session $SESSION_ID
```

```typescript
await client.page.select(session.id, '@e8', 'option-value');
```

### check

Checks (or unchecks) a checkbox or radio button.

```bash
testmu-browser-cloud page check @e3 --session $SESSION_ID
```

```typescript
await client.page.check(session.id, '@e3');
```

### hover

Moves the cursor over an element, triggering hover states and tooltips.

```bash
testmu-browser-cloud page hover @e7 --session $SESSION_ID
```

```typescript
await client.page.hover(session.id, '@e7');
```

### press

Dispatches a key press. Supports modifier combinations.

```bash
testmu-browser-cloud page press "Enter" --session $SESSION_ID
testmu-browser-cloud page press "Control+A" --session $SESSION_ID
testmu-browser-cloud page press "Shift+Tab" --session $SESSION_ID
```

```typescript
await client.page.press(session.id, 'Enter');
await client.page.press(session.id, 'Control+A');
```

### scroll

Scrolls the viewport or a specific element. Direction: `up`, `down`, `left`, `right`.

```bash
# Scroll the viewport
testmu-browser-cloud page scroll down 300 --session $SESSION_ID

# Scroll a specific element horizontally
testmu-browser-cloud page scroll @e4 right 200 --session $SESSION_ID
```

```typescript
await client.page.scroll(session.id, 'down', 300);
await client.page.scroll(session.id, '@e4', 'right', 200);
```

### wait

Waits for an element to appear in the DOM or for a fixed number of milliseconds.

```bash
# Wait for a CSS selector
testmu-browser-cloud page wait "#modal" --session $SESSION_ID

# Wait for a @ref
testmu-browser-cloud page wait @e6 --session $SESSION_ID

# Wait a fixed duration (ms)
testmu-browser-cloud page wait 2000 --session $SESSION_ID
```

```typescript
await client.page.wait(session.id, '#modal');
await client.page.wait(session.id, '@e6');
await client.page.wait(session.id, 2000);
```

---

## Query Commands

Read data from the page without modifying it.

```bash
testmu-browser-cloud page get text  @e10 --session $SESSION_ID
testmu-browser-cloud page get html  @e10 --session $SESSION_ID
testmu-browser-cloud page get value @e5  --session $SESSION_ID
testmu-browser-cloud page get attr  @e10 href --session $SESSION_ID
testmu-browser-cloud page get url        --session $SESSION_ID
testmu-browser-cloud page get title      --session $SESSION_ID
```

```typescript
const text  = await client.page.get(session.id, 'text',  '@e10');
const html  = await client.page.get(session.id, 'html',  '@e10');
const value = await client.page.get(session.id, 'value', '@e5');
const href  = await client.page.get(session.id, 'attr',  '@e10', 'href');
const url   = await client.page.get(session.id, 'url');
const title = await client.page.get(session.id, 'title');
```

---

## State Check Commands

Returns a boolean indicating the current element state.

```bash
testmu-browser-cloud page is visible @e4 --session $SESSION_ID
testmu-browser-cloud page is enabled @e8 --session $SESSION_ID
testmu-browser-cloud page is checked @e3 --session $SESSION_ID
```

```typescript
const visible = await client.page.is(session.id, 'visible', '@e4');
const enabled = await client.page.is(session.id, 'enabled', '@e8');
const checked = await client.page.is(session.id, 'checked', '@e3');
```

---

## Find Commands

Search for elements without knowing their ref IDs in advance.

### By ARIA Role

```bash
testmu-browser-cloud page find role button --session $SESSION_ID
testmu-browser-cloud page find role textbox --session $SESSION_ID
```

```typescript
const buttons = await client.page.find(session.id, 'role', 'button');
```

### By Visible Text

```bash
testmu-browser-cloud page find text "Sign in" --session $SESSION_ID
```

```typescript
const els = await client.page.find(session.id, 'text', 'Sign in');
```

### By ARIA Label

```bash
testmu-browser-cloud page find label "Email address" --session $SESSION_ID
```

```typescript
const els = await client.page.find(session.id, 'label', 'Email address');
```

Find returns an array of elements, each with their `@ref` ID, role, and label. Use a returned ref in any subsequent command.

---

## JavaScript Evaluation

### Security Model

`evaluate()` is **blocked by default**. Any call without explicit opt-in throws an error. This prevents prompt-injection attacks where page content tricks an agent into running arbitrary JavaScript.

To enable evaluation, you must pass the `allowUnsafe` option (SDK) or the `--allow-unsafe` flag (CLI):

```bash
# Blocked — will error
testmu-browser-cloud page eval "document.title" --session $SESSION_ID

# Explicitly opt in
testmu-browser-cloud page eval "document.title" --allow-unsafe --session $SESSION_ID
```

```typescript
// Blocked — throws
await client.page.evaluate(session.id, 'document.title');

// Opt in
const result = await client.page.evaluate(session.id, 'document.title', { allowUnsafe: true });
```

Only use `--allow-unsafe` when the script is hardcoded in your agent, not derived from page content.

---

## Diff / Change Detection

The snapshot diff feature helps agents detect what changed after an interaction without re-processing the entire tree.

**How it works:**

1. Take a full snapshot — this becomes the baseline, saved to `prev-snapshot.{clientId}.json`.
2. Perform some interaction (click, fill, etc.).
3. Take a diff snapshot — only changed, added, or removed elements are returned.

```bash
# Baseline
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id my-agent

# ... interact ...

# Diff
testmu-browser-cloud page snapshot --diff --session $SESSION_ID --client-id my-agent
```

Diffs survive process restarts because the baseline is written to disk. Duplicate `role:name` keys in the accessibility tree are de-duplicated to prevent silent data loss.

---

## Parallel Session Isolation

When multiple AI agents operate on the same session concurrently, they must not overwrite each other's ref maps or snapshot baselines.

Pass `--client-id <id>` on every `page` command to scope all state to that agent:

```bash
# Agent 1
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id agent-1
testmu-browser-cloud page click @e12 --session $SESSION_ID --client-id agent-1

# Agent 2 — isolated state
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id agent-2
testmu-browser-cloud page fill @e5 "foo" --session $SESSION_ID --client-id agent-2
```

**Per-client files** (stored with `0o600` permissions):

| File | Purpose |
|------|---------|
| `refs.{clientId}.json` | Ref-to-selector map for the client |
| `prev-snapshot.{clientId}.json` | Snapshot diff baseline |
| `page-state.{clientId}.json` | Last navigated URL |

**Auto-generated client ID:** When `--client-id` is omitted, the CLI uses `cli-{pid}` so each process is naturally isolated.

**Security:** `clientId` values are sanitized against path traversal — characters like `../` are rejected.

---

## Session Reconnection

The page service persists the last navigated URL so that CLI agents running in separate processes can resume where they left off.

```bash
# Process 1: Navigate during a session
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id my-agent

# Process 2 (later): Automatically re-navigates to the last URL
testmu-browser-cloud page snapshot --session $SESSION_ID --client-id my-agent

# Disable auto-navigation
testmu-browser-cloud page snapshot --session $SESSION_ID --no-auto-navigate
```

The smart page selector also prefers pages with real URLs (not `chrome://new-tab-page`) when multiple tabs are open.

---

## CLI vs SDK

| Capability | CLI | SDK |
|-----------|-----|-----|
| Snapshot | `page snapshot [--diff] [--compact]` | `client.page.snapshot(id, opts)` |
| Click | `page click <ref\|selector>` | `client.page.click(id, ref)` |
| Fill | `page fill <ref> <value>` | `client.page.fill(id, ref, value)` |
| Type | `page type <ref> <text>` | `client.page.type(id, ref, text)` |
| Select | `page select <ref> <value>` | `client.page.select(id, ref, value)` |
| Check | `page check <ref>` | `client.page.check(id, ref)` |
| Hover | `page hover <ref>` | `client.page.hover(id, ref)` |
| Press | `page press <key>` | `client.page.press(id, key)` |
| Scroll | `page scroll [ref] <dir> <px>` | `client.page.scroll(id, ...)` |
| Wait | `page wait <ref\|ms>` | `client.page.wait(id, target)` |
| Get | `page get <prop> [ref] [attr]` | `client.page.get(id, prop, ...)` |
| Is | `page is <state> <ref>` | `client.page.is(id, state, ref)` |
| Find | `page find <by> <value>` | `client.page.find(id, by, value)` |
| Eval | `page eval <script> --allow-unsafe` | `client.page.evaluate(id, script, { allowUnsafe: true })` |

All CLI commands accept `--session <id>`, `--client-id <id>`, and `--no-auto-navigate`.
All commands return JSON. Use `--pretty` for human-readable output.
