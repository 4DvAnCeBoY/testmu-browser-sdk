# SnapshotService & Page Tools Design

**Date:** 2026-03-30
**Status:** Draft v2 (post-review)
**Goal:** Add agent-browser-like capabilities to browser-cloud SDK without breaking existing users
**Review:** Incorporates findings from critic and architect reviews (2026-03-30)

---

## 1. Problem Statement

### What existing SDK users do today

```typescript
const browser = new Browser();
const session = await browser.sessions.create({ local: true });
const page = await browser.puppeteer.connect(session);

// Option A: Raw Puppeteer/Playwright — user writes framework-specific code
await page.click('#submit-btn');
const text = await page.$eval('.price', el => el.textContent);

// Option B: Computer actions — coordinate-based, requires vision AI
await browser.sessions.computer(session.id, page, { action: 'click', coordinate: [100, 200] });
```

### What's missing

1. **No way for a non-vision LLM to "see" the page** — no structured representation
2. **No selector-based interaction via SDK** — only raw framework APIs or coords
3. **No element queries** — can't ask "is this visible?" or "what's the text of this element?"
4. **No @ref system** — LLMs must guess CSS selectors or use coordinates

### Pre-existing bug: CLI sessions don't survive across processes

The current `SessionStore` at `session-manager.ts:316-344` is an in-memory `Map` inside `SessionRepository`. When `testmu-browser-cloud session create` runs, the session lives in that process's memory. When the process exits, the data is gone. `session list` in a new process returns `[]`. This design fixes that bug as a side effect.

### What we want

```typescript
// SDK user — new capabilities, zero breaking changes
const browser = new Browser();
const session = await browser.sessions.create({ local: true });
const page = await browser.puppeteer.connect(session);

// Bind page to session (once, for ref tracking)
browser.page.bind(page, session.id);

const snap = await browser.page.snapshot(page);
// → { ref: '@root', role: 'WebArea', name: 'My App', children: [
//     { ref: '@e1', role: 'navigation', children: [...] },
//     { ref: '@e2', role: 'button', name: 'Submit', ... }
//   ]}

await browser.page.click(page, '@e2');
await browser.page.fill(page, '@e3', 'hello@test.com');
const text = await browser.page.getText(page, '@e2');  // → "Submit"
```

```bash
# CLI user (Claude Code, Gemini CLI) — same features via `page` subcommand
testmu-browser-cloud page snapshot --session $ID
testmu-browser-cloud page click "@e2" --session $ID
testmu-browser-cloud page fill "@e3" "hello@test.com" --session $ID
testmu-browser-cloud page get text "@e2" --session $ID
```

---

## 2. Design Constraints

1. **Zero breaking changes** — existing `Browser` class API unchanged, new services are additive
2. **Framework-agnostic** — works with Puppeteer AND Playwright pages (follow `ContextService` pattern)
3. **Local + Cloud** — works identically on local Chrome and LambdaTest cloud sessions
4. **CLI-first for AI** — output must be token-efficient, JSON-parseable, compact
5. **Stateless CLI, stateful refs** — @refs must survive across CLI invocations within a session
6. **No new browser dependencies** — use native `page.accessibility.snapshot()` (Puppeteer and Playwright) + `page.evaluate()` for locator generation only
7. **Performance** — snapshot must complete in <500ms for typical pages
8. **SDK convention** — PageService methods take `(page)` or `(page, selector)`, NOT `(page, selector, sessionId)`. Session binding is done once via `bind()`, matching existing ComputerService/ContextService patterns.
9. **No CLI command name collisions** — new commands live under `page` subcommand to avoid conflict with existing `click`, `type`, `scroll` coordinate-based commands

---

## 3. Architecture

### 3.1 New Services + Shared Utilities (additive to Browser class)

```
Browser class (existing — unchanged)
├── sessions        (SessionManager)       ← existing, modified: accepts SessionStore interface
├── puppeteer       (PuppeteerAdapter)     ← existing
├── playwright      (PlaywrightAdapter)    ← existing
├── selenium        (SeleniumAdapter)      ← existing
├── quick           (QuickActionsService)  ← existing
├── computer        (ComputerService)      ← existing (Puppeteer-only, unchanged)
├── context         (ContextService)       ← existing
├── files, extensions, credentials, profiles, captcha, tunnel, events  ← existing
│
├── page            (PageService)          ← NEW: selector-based interaction + queries + ref resolution
├── snapshot        (SnapshotService)      ← NEW: accessibility tree capture + @ref assignment
└── network         (NetworkService)       ← NEW (Phase 2): request blocking, mocking, interception

Shared utilities:
├── utils/framework-detect.ts              ← NEW: extracted from ContextService, shared by 3+ services
└── stores/
    ├── session-store.ts                   ← NEW: SessionStore interface
    ├── memory-session-store.ts            ← NEW: InMemorySessionStore (SDK default)
    ├── disk-session-store.ts              ← NEW: DiskSessionStore (CLI mode)
    ├── ref-store.ts                       ← NEW: RefStore interface
    ├── memory-ref-store.ts                ← NEW: InMemoryRefStore (SDK default)
    └── disk-ref-store.ts                  ← NEW: DiskRefStore (CLI mode)
```

### 3.2 Service Responsibilities

**SnapshotService** — accessibility tree capture + @ref assignment
- Captures accessibility tree using native `page.accessibility.snapshot()` (NOT DOM walking)
- Enriches tree nodes with xpath/css locators via `page.evaluate()`
- Assigns sequential `@ref` IDs to interactive/semantic elements
- Stores ref mappings via RefStore interface (in-memory for SDK, disk for CLI)
- Supports snapshot diffing (compare current to previous)

**PageService** — selector-based interaction, queries, and ref resolution
- Click, fill, type, select, check, hover, drag, upload by @ref or CSS selector
- Query element state (getText, getAttr, getValue, isVisible, isEnabled, isChecked)
- Find elements by role, label, text, placeholder
- Navigate, back, forward, reload, wait
- Owns ref resolution: resolves @ref → locator using RefStore data, with fallback chain
- Owns session binding: `page.bind(page, sessionId)` via WeakMap

**NetworkService** (Phase 2 — detailed design deferred)
- Block, mock, intercept requests
- Set custom headers
- Read network logs

### 3.3 Key Design Decision: `sessionId` Handling

**Problem:** Existing services (ComputerService, ContextService) take `page` only — no `sessionId`. Adding `sessionId` to every PageService call breaks the convention.

**Solution:** Session binding via WeakMap, called once:

```typescript
// Internal to PageService
private pageSessionMap = new WeakMap<object, string>();

bind(page: any, sessionId: string): void {
    this.pageSessionMap.set(page, sessionId);
}

private getSessionId(page: any): string {
    const id = this.pageSessionMap.get(page);
    if (!id) throw new Error('Page not bound to a session. Call browser.page.bind(page, sessionId) first.');
    return id;
}
```

**SDK usage:**
```typescript
browser.page.bind(page, session.id);      // once
await browser.page.click(page, '@e5');     // no sessionId needed
await browser.page.getText(page, '@e3');   // no sessionId needed
```

**CLI usage:** The page-manager auto-binds after connecting.

### 3.4 Key Design Decision: Framework Detection

**Problem:** `detectFramework()` is duplicated in ContextService. PageService and SnapshotService also need it.

**Solution:** Extract to shared utility:

```typescript
// src/testmu-cloud/utils/framework-detect.ts
export function detectFramework(page: any): 'puppeteer' | 'playwright' {
    // Playwright pages have page.context() method
    if (typeof page.context === 'function') return 'playwright';
    return 'puppeteer';
}
```

Used by: ContextService (refactored), PageService, SnapshotService.

### 3.5 Data Flow

```
SDK User / CLI Command
         │
         ▼
    PageService.click(page, '@e5')
         │
         ├── getSessionId(page) via WeakMap → sessionId
         │
         ├── Is '@e5' a ref? ──► RefStore.get(sessionId, '@e5')
         │                              │
         │                              ▼
         │                     { xpath: '/html/body/form/button[2]',
         │                       css: 'form > button',
         │                       role: 'button', name: 'Submit' }
         │                              │
         │         ┌────────────────────┤
         │         ▼                    ▼
         │    Try xpath locator    Verify role/name match
         │         │                    │
         │         ├── Fail? ──► Try CSS locator + verify
         │         │                    │
         │         ├── Fail? ──► Try getByRole(role, { name }) (fuzzy)
         │         │                    │
         │         ├── Fail? ──► Error: "@e5 (button 'Submit') not found. Run 'page snapshot' to refresh."
         │         │
         ├── Or CSS selector? ──────────┤
         │                              │
         ▼                              ▼
    detectFramework() ──► Puppeteer: element.click()
                      └── Playwright: locator.click()
```

**Note:** Ref resolution lives in PageService (not SnapshotService). SnapshotService is a pure data service: capture tree, assign refs, store mappings. PageService owns the fallback chain because it already has the live page object.

---

## 4. SnapshotService Design

### 4.1 Snapshot Capture — Two-Phase Approach

**Phase A: Capture accessibility tree (native API)**

Uses the browser's built-in accessibility engine, which correctly computes:
- Implicit ARIA roles (e.g., `<nav>` → `navigation`, `<button>` → `button`)
- Accessible names (label association, aria-label, alt text, title)
- State (disabled, checked, expanded, selected)
- Visibility and relevance filtering

```typescript
// Both Puppeteer and Playwright support this
const accessibilityTree = await page.accessibility.snapshot({
    interestingOnly: true  // Filter to meaningful nodes
});
```

> **Migration note:** Playwright deprecated `page.accessibility.snapshot()` in v1.41 in favor of `locator.ariaSnapshot()`. Current implementation uses the deprecated API (still functional). Plan migration to `ariaSnapshot()` in a future release.

**Phase B: Generate locators for each node (page.evaluate)**

The accessibility tree gives us role + name but NOT xpath/css selectors. We generate locators separately:

```typescript
// Runs in browser context to generate locator for a specific element
const locators = await page.evaluate((role: string, name: string) => {
    // Find element matching role+name, generate xpath and css
    function findElement(role: string, name: string): { xpath: string, css: string } | null {
        // Use querySelectorAll + role/name matching
        // Generate xpath via tree walking
        // Generate css via id, classes, nth-child
        return { xpath, css };
    }
    return findElement(role, name);
}, node.role, node.name);
```

**Why two phases instead of one DOM walk?**
- The accessibility tree from the browser engine is **far more accurate** than manual DOM walking
- Implementing `getImplicitRole()` and `getAccessibleName()` correctly is a ~20-page spec (WAI-ARIA name computation) — the browser already does this
- `page.evaluate()` DOM walking misses computed roles, JavaScript event listeners, and framework-specific accessibility
- Separation of concerns: tree structure from browser engine, locators from DOM inspection

### 4.2 Snapshot Types

```typescript
interface SnapshotOptions {
    interactiveOnly?: boolean;  // Default: false. If true, only interactive elements get @refs
    maxDepth?: number;          // Default: unlimited. Limit tree depth
    maxElements?: number;       // Default: 500. Cap for token budget (warning if truncated)
    selector?: string;          // Scope snapshot to subtree (CSS selector)
    compact?: boolean;          // Default: false. Minimal text output for small context windows
    includeFrames?: boolean;    // Default: true. Include iframe content
}

interface SnapshotNode {
    ref?: string;               // '@e1', '@e2' — only on ref-eligible nodes
    role: string;               // ARIA role: button, textbox, link, heading, etc.
    name: string;               // Accessible name (button text, label, alt text)
    value?: string;             // Current value (for inputs, selects)
    description?: string;       // ARIA description
    frameId?: string;           // If from an iframe, identifies which frame
    state?: {                   // Element state flags
        disabled?: boolean;
        checked?: boolean;
        expanded?: boolean;
        selected?: boolean;
        required?: boolean;
        focused?: boolean;
    };
    children?: SnapshotNode[];  // Child nodes
}

interface SnapshotResult {
    url: string;                // Current page URL
    title: string;              // Page title
    tree: SnapshotNode;         // Root of accessibility tree
    refCount: number;           // Total @refs assigned
    totalElements: number;      // Total elements in tree (including non-ref)
    truncated: boolean;         // True if maxElements was hit
    timestamp: number;          // Capture time (ms)
}
```

### 4.3 @Ref Assignment Rules

Refs are assigned **only** to elements that an AI agent would want to interact with or reference.

**Gets a @ref:**
- Buttons, links, inputs, textareas, selects, checkboxes, radios
- Elements with explicit ARIA `role` attribute that is interactive (menu, tab, slider, etc.)
- Headings (h1-h6 / role="heading")
- Images with alt text
- Navigation landmarks (nav, main, header, footer, aside)

**Does NOT get a @ref (appears in tree without ref):**
- Generic containers (group, region without label)
- Paragraphs, spans with no semantic role
- Layout-only elements
- Hidden/aria-hidden elements
- Elements inside `<script>`, `<style>`, `<noscript>`

**Ref format:** `@e1`, `@e2`, `@e3`... Sequential, 1-indexed, assigned in tree traversal order.

**Filtering in assignRefs():**

```typescript
const REF_ELIGIBLE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'listbox',
    'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'searchbox',
    'slider', 'spinbutton', 'switch', 'tab', 'treeitem',
    'heading', 'img', 'navigation', 'main', 'banner', 'contentinfo',
    'complementary', 'form', 'search', 'dialog', 'alertdialog', 'alert'
]);

function shouldAssignRef(node: AccessibilityNode): boolean {
    return REF_ELIGIBLE_ROLES.has(node.role);
}
```

### 4.4 Iframe and Shadow DOM Handling

**Iframes:**
When `includeFrames: true` (default), snapshot enumerates frames:

```typescript
const frames = page.frames(); // Works on both Puppeteer and Playwright
for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    const frameTree = await frame.accessibility?.snapshot({ interestingOnly: true });
    // Merge into main tree with frameId marker
}
```

Iframe nodes appear in the tree with a `frameId` property. Refs assigned to iframe elements include the frame context for resolution.

**Shadow DOM:**
- Open shadow DOM: The browser's accessibility API (`page.accessibility.snapshot()`) already traverses open shadow roots — no special handling needed.
- Closed shadow DOM: **Known limitation.** Closed shadow DOM is inaccessible to the accessibility API. Documented as out-of-scope.

### 4.5 Ref Persistence

**Problem:** CLI commands are separate processes. `testmu-browser-cloud page snapshot` runs, exits, then `testmu-browser-cloud page click @e5` runs. How does the second command know what @e5 refers to?

**Solution: RefStore interface with two implementations**

```typescript
// src/testmu-cloud/stores/ref-store.ts
interface RefStore {
    save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void>;
    load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null>;
    get(sessionId: string, ref: string): Promise<RefMapping | null>;
    clear(sessionId: string): Promise<void>;
}

interface RefMapping {
    xpath: string;
    css: string;
    role: string;
    name: string;
    frameId?: string;  // For iframe elements
}
```

**InMemoryRefStore** (SDK default):
```typescript
// Used when Browser class is instantiated in a long-lived process
class InMemoryRefStore implements RefStore {
    private store = new Map<string, { refs: Map<string, RefMapping>, url: string }>();
    // ... straightforward Map operations
}
```

**DiskRefStore** (CLI mode):
```typescript
// Used by CLI page-manager for cross-process persistence
class DiskRefStore implements RefStore {
    private baseDir: string; // ~/.testmuai/sessions/

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void> {
        const dir = path.join(this.baseDir, sessionId);
        await fs.ensureDir(dir);
        const data = JSON.stringify({ version: 1, url, timestamp: Date.now(), refs: Object.fromEntries(refs) });
        // Atomic write: temp file → rename (prevents corruption from concurrent access)
        const tmpPath = path.join(dir, `refs.${process.pid}.tmp`);
        await fs.writeFile(tmpPath, data, { mode: 0o600 }); // Secure file permissions
        await fs.rename(tmpPath, path.join(dir, 'refs.json'));
    }

    async load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        const filePath = path.join(this.baseDir, sessionId, 'refs.json');
        if (!await fs.pathExists(filePath)) return null;
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        return { refs: new Map(Object.entries(data.refs)), url: data.url };
    }
    // ...
}
```

**refs.json format:**
```json
{
  "version": 1,
  "url": "https://example.com/checkout",
  "timestamp": 1711756800000,
  "refs": {
    "@e1": { "xpath": "/html/body/nav/a[1]", "css": "nav > a:nth-child(1)", "role": "link", "name": "Home" },
    "@e2": { "xpath": "/html/body/nav/a[2]", "css": "nav > a:nth-child(2)", "role": "link", "name": "Cart" },
    "@e3": { "xpath": "/html/body/form/input[1]", "css": "#email", "role": "textbox", "name": "Email" },
    "@e4": { "xpath": "/html/body/form/input[2]", "css": "#password", "role": "textbox", "name": "Password" },
    "@e5": { "xpath": "/html/body/form/button", "css": "form > button", "role": "button", "name": "Submit" }
  }
}
```

**Ref staleness:** When the page URL changes (navigation), old refs become invalid. The `load()` method compares stored URL to current URL. On mismatch, ref resolution returns an error with guidance: `"Refs are stale (page navigated from X to Y). Run 'page snapshot' to refresh."`

**Security:**
- File permissions set to `0600` (owner read/write only)
- Stale session cleanup: on any CLI invocation, dirs older than 24 hours with no matching active session are deleted
- No credentials or page content stored in refs — only structural locators

### 4.6 Compact Output Format

For CLI / AI agent consumption, the snapshot should be token-efficient:

**Full format (default):**
```json
{
  "url": "https://example.com/login",
  "title": "Login - Example",
  "tree": {
    "ref": "@e1", "role": "WebArea", "name": "Login - Example",
    "children": [
      { "ref": "@e2", "role": "heading", "name": "Sign In" },
      { "ref": "@e3", "role": "textbox", "name": "Email", "value": "" },
      { "ref": "@e4", "role": "textbox", "name": "Password", "value": "" },
      { "ref": "@e5", "role": "button", "name": "Submit" },
      { "ref": "@e6", "role": "link", "name": "Forgot password?" }
    ]
  },
  "refCount": 6,
  "totalElements": 24,
  "truncated": false
}
```

**Compact format (`--compact` or `compact: true`):**
```
[Login - Example] https://example.com/login
@e2 heading "Sign In"
@e3 textbox "Email" value=""
@e4 textbox "Password" value=""
@e5 button "Submit"
@e6 link "Forgot password?"
```

The compact format is ~70% fewer tokens than JSON — critical for LLM context budgets. Follows agent-browser's format for ecosystem compatibility.

### 4.7 Snapshot Diffing

Compare current page state to previous snapshot:

```typescript
interface SnapshotDiff {
    urlChanged: boolean;
    previousUrl?: string;
    currentUrl: string;
    added: SnapshotNode[];      // New elements with refs
    removed: { ref: string, role: string, name: string }[];  // Gone
    changed: {                  // Modified
        ref: string;
        role: string;
        name: string;
        changes: { field: string, from: string, to: string }[];
    }[];
    unchanged: number;          // Count of unchanged elements
}
```

**Storage:** Previous snapshot saved to `~/.testmuai/sessions/{id}/snapshot.json` (DiskRefStore) or in-memory (InMemoryRefStore).

**CLI usage:**
```bash
# First snapshot
testmu-browser-cloud page snapshot --session $ID

# ... agent does something ...

# Diff — only shows what changed
testmu-browser-cloud page snapshot --diff --session $ID
```

---

## 5. PageService Design

### 5.1 API Surface

All methods take `page: any` as first arg (framework-agnostic). Session ID is resolved internally via WeakMap binding. No `sessionId` parameter on any method.

**Binding:**
```typescript
class PageService {
    bind(page: any, sessionId: string): void  // Call once after connecting
}
```

**Snapshot:**
```typescript
class PageService {
    async snapshot(page: any, options?: SnapshotOptions): Promise<SnapshotResult>
    async snapshotDiff(page: any): Promise<SnapshotDiff>
}
```

**Navigation:**
```typescript
class PageService {
    async navigate(page: any, url: string, options?: { waitUntil?: string }): Promise<{ url: string, title: string }>
    async back(page: any): Promise<{ url: string, title: string }>
    async forward(page: any): Promise<{ url: string, title: string }>
    async reload(page: any): Promise<{ url: string, title: string }>
    async wait(page: any, selectorOrMs: string | number): Promise<void>
}
```

**Interaction (accepts @ref or CSS selector):**
```typescript
class PageService {
    async click(page: any, selector: string, options?: { button?: string }): Promise<void>
    async fill(page: any, selector: string, value: string): Promise<void>
    async type(page: any, selector: string, text: string): Promise<void>
    async select(page: any, selector: string, ...values: string[]): Promise<void>
    async check(page: any, selector: string): Promise<void>
    async uncheck(page: any, selector: string): Promise<void>
    async hover(page: any, selector: string): Promise<void>
    async focus(page: any, selector: string): Promise<void>
    async drag(page: any, source: string, target: string): Promise<void>
    async upload(page: any, selector: string, files: string[]): Promise<void>
    async press(page: any, key: string): Promise<void>
    async scroll(page: any, options?: { selector?: string, direction?: string, amount?: number }): Promise<void>
}
```

**Queries:**
```typescript
class PageService {
    async getText(page: any, selector: string): Promise<string>
    async getHtml(page: any, selector: string): Promise<string>
    async getValue(page: any, selector: string): Promise<string>
    async getAttr(page: any, selector: string, attribute: string): Promise<string | null>
    async getUrl(page: any): Promise<string>
    async getTitle(page: any): Promise<string>
    async getCount(page: any, selector: string): Promise<number>
    async getBoundingBox(page: any, selector: string): Promise<{ x: number, y: number, width: number, height: number } | null>
}
```

**State checks:**
```typescript
class PageService {
    async isVisible(page: any, selector: string): Promise<boolean>
    async isHidden(page: any, selector: string): Promise<boolean>
    async isEnabled(page: any, selector: string): Promise<boolean>
    async isDisabled(page: any, selector: string): Promise<boolean>
    async isChecked(page: any, selector: string): Promise<boolean>
    async isFocused(page: any, selector: string): Promise<boolean>
    async isEditable(page: any, selector: string): Promise<boolean>
}
```

**Find elements:**
```typescript
class PageService {
    async find(page: any, selector: string): Promise<{ ref: string, role: string, name: string }[]>
    async findByRole(page: any, role: string, options?: { name?: string }): Promise<{ ref: string, name: string }[]>
    async findByText(page: any, text: string): Promise<{ ref: string, role: string, name: string }[]>
    async findByLabel(page: any, text: string): Promise<{ ref: string, role: string, name: string }[]>
}
```

**Evaluate:**
```typescript
class PageService {
    async evaluate(page: any, script: string): Promise<any>
}
```

### 5.2 Selector Resolution (Owned by PageService)

Every interaction/query method goes through this resolver:

```typescript
private async resolveSelector(page: any, selector: string): Promise<any> {
    const framework = detectFramework(page);

    // 1. Is it a @ref?
    if (selector.startsWith('@e')) {
        const sessionId = this.getSessionId(page);
        const mapping = await this.refStore.get(sessionId, selector);

        if (!mapping) {
            throw new Error(`Unknown ref "${selector}". Run 'page snapshot' first.`);
        }

        // Fallback chain: xpath → css → role+name
        return this.resolveRefToElement(page, mapping, selector, framework);
    }

    // 2. CSS selector or XPath
    if (framework === 'playwright') {
        return page.locator(selector);
    } else {
        if (selector.startsWith('//') || selector.startsWith('xpath/')) {
            return page.waitForSelector(`::-p-xpath(${selector})`);
        }
        return page.waitForSelector(selector);
    }
}

private async resolveRefToElement(page: any, mapping: RefMapping, ref: string, framework: string): Promise<any> {
    // Step 1: Try XPath
    try {
        const el = framework === 'playwright'
            ? page.locator(`xpath=${mapping.xpath}`)
            : await page.waitForSelector(`::-p-xpath(${mapping.xpath})`, { timeout: 2000 });

        // Verify role/name still match (guard against DOM changes)
        // If match → return element
        return el;
    } catch {}

    // Step 2: Try CSS
    try {
        const el = framework === 'playwright'
            ? page.locator(mapping.css)
            : await page.waitForSelector(mapping.css, { timeout: 2000 });
        return el;
    } catch {}

    // Step 3: Fuzzy match by role + name (Playwright only)
    if (framework === 'playwright') {
        try {
            return page.getByRole(mapping.role as any, { name: mapping.name });
        } catch {}
    }

    // Step 4: Fail with actionable error
    throw new Error(
        `Element ${ref} (${mapping.role} "${mapping.name}") no longer found on page. ` +
        `Page may have changed. Run 'page snapshot' to refresh refs.`
    );
}
```

---

## 6. Session Persistence (Fixes Pre-existing Bug)

### 6.1 SessionStore Interface

```typescript
// src/testmu-cloud/stores/session-store.ts
interface SessionStore {
    save(session: Session): Promise<void>;
    get(id: string): Promise<Session | null>;
    list(): Promise<Session[]>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
}
```

**InMemorySessionStore** (SDK default — existing behavior wrapped in interface):
```typescript
class InMemorySessionStore implements SessionStore {
    private sessions = new Map<string, Session>();
    // ... wraps existing SessionRepository logic
}
```

**DiskSessionStore** (CLI mode):
```typescript
class DiskSessionStore implements SessionStore {
    private baseDir: string; // ~/.testmuai/sessions/

    async save(session: Session): Promise<void> {
        const dir = path.join(this.baseDir, session.id);
        await fs.ensureDir(dir);
        const data = JSON.stringify({
            id: session.id,
            websocketUrl: session.websocketUrl,
            adapter: session.config.adapter || 'puppeteer',  // CRITICAL: needed for reconnection
            config: session.config,
            status: session.status,
            createdAt: session.createdAt,
            debugUrl: session.debugUrl
        });
        // Atomic write
        const tmpPath = path.join(dir, `session.${process.pid}.tmp`);
        await fs.writeFile(tmpPath, data, { mode: 0o600 });
        await fs.rename(tmpPath, path.join(dir, 'session.json'));
    }

    async get(id: string): Promise<Session | null> {
        const filePath = path.join(this.baseDir, id, 'session.json');
        if (!await fs.pathExists(filePath)) return null;
        return JSON.parse(await fs.readFile(filePath, 'utf-8'));
    }

    async list(): Promise<Session[]> {
        const dirs = await fs.readdir(this.baseDir).catch(() => []);
        const sessions: Session[] = [];
        for (const dir of dirs) {
            const session = await this.get(dir);
            if (session && session.status === 'live') sessions.push(session);
        }
        return sessions;
    }

    async delete(id: string): Promise<void> {
        await fs.remove(path.join(this.baseDir, id));
    }

    async deleteAll(): Promise<void> {
        const dirs = await fs.readdir(this.baseDir).catch(() => []);
        for (const dir of dirs) await this.delete(dir);
    }
}
```

### 6.2 SessionManager Modification (Minimal Change)

```typescript
// session-manager.ts — one change: accept optional store
export class SessionManager {
    private store: SessionStore;

    constructor(store?: SessionStore) {
        this.store = store || new InMemorySessionStore();
        // ... rest unchanged
    }

    async createSession(config: SessionConfig): Promise<Session> {
        // ... existing logic unchanged ...
        const session = { id, websocketUrl, ... };
        await this.store.save(session);  // was: SessionStore.start(session, null)
        return session;
    }

    async releaseSession(id: string): Promise<ReleaseResponse> {
        // ... existing logic ...
        await this.store.delete(id);  // was: SessionStore.delete(id)
        return { success: true, message: `Session ${id} released` };
    }

    listSessions(): Promise<Session[]> {
        return this.store.list();  // was: SessionStore.list()
    }
}
```

**Breaking change risk: NONE.** Default constructor still works identically (uses InMemorySessionStore). CLI passes DiskSessionStore.

### 6.3 Browser Class Change (Minimal)

```typescript
export class Browser {
    constructor(options?: { sessionStore?: SessionStore, refStore?: RefStore }) {
        // Existing services — unchanged
        this.sessionManager = new SessionManager(options?.sessionStore);
        // ... all other existing initialization unchanged ...

        // NEW services
        const refStore = options?.refStore || new InMemoryRefStore();
        this.snapshot = new SnapshotService(refStore);
        this.page = new PageService(this.snapshot, refStore);
        this.network = new NetworkService();
    }
}
```

**Existing users:** `new Browser()` works exactly as before — no args, in-memory stores.
**CLI:** `new Browser({ sessionStore: new DiskSessionStore(...), refStore: new DiskRefStore(...) })`.

---

## 7. CLI Integration

### 7.1 Page-Manager (Connect-per-Command)

The CLI page-manager handles dual-adapter reconnection:

```typescript
// src/cli/page-manager.ts
import puppeteer from 'puppeteer-core';
import { chromium } from 'playwright-core';

async function getSessionPage(sessionId: string, store: DiskSessionStore): Promise<{
    page: any,
    framework: 'puppeteer' | 'playwright',
    cleanup: () => Promise<void>
}> {
    const session = await store.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found. Run 'session create' first.`);
    if (session.status !== 'live') throw new Error(`Session "${sessionId}" is ${session.status}.`);

    const adapter = session.adapter || 'puppeteer';

    if (adapter === 'playwright') {
        // Playwright reconnection
        const browser = await chromium.connectOverCDP(session.websocketUrl);
        const contexts = browser.contexts();
        const context = contexts[0] || await browser.newContext();
        const pages = context.pages();
        const page = pages[pages.length - 1] || await context.newPage();

        return {
            page,
            framework: 'playwright',
            cleanup: async () => { await browser.close(); }  // Playwright: close disconnects
        };
    } else {
        // Puppeteer reconnection
        const browser = await puppeteer.connect({
            browserWSEndpoint: session.websocketUrl
        });
        const pages = await browser.pages();
        const page = pages[pages.length - 1] || await browser.newPage();

        return {
            page,
            framework: 'puppeteer',
            cleanup: async () => { browser.disconnect(); }  // Puppeteer: disconnect, don't close
        };
    }
}
```

### 7.2 CLI Command Namespace: `page` Subcommand

All new commands live under `page` to avoid collision with existing coordinate-based commands:

```bash
# EXISTING commands — UNCHANGED, no breaking changes
testmu-browser-cloud click 100 200 --session $ID         # coord-based (ComputerService)
testmu-browser-cloud type "hello" --session $ID           # keyboard type (ComputerService)
testmu-browser-cloud scroll 0 500 --session $ID           # coord-based scroll

# NEW commands — under `page` subcommand
testmu-browser-cloud page click "@e5" --session $ID       # selector-based (PageService)
testmu-browser-cloud page fill "@e3" "hello" --session $ID
testmu-browser-cloud page type "@e3" "hello" --session $ID
testmu-browser-cloud page scroll --direction down --session $ID
```

**Full new CLI commands:**

**Snapshot:**
```bash
testmu-browser-cloud page snapshot --session $ID
testmu-browser-cloud page snapshot --session $ID --compact
testmu-browser-cloud page snapshot --session $ID --interactive-only
testmu-browser-cloud page snapshot --session $ID --diff
testmu-browser-cloud page snapshot --session $ID --max-elements 100
testmu-browser-cloud page snapshot --session $ID --selector "#main-content"
```

**Interaction:**
```bash
testmu-browser-cloud page click "@e5" --session $ID
testmu-browser-cloud page click "#submit-btn" --session $ID
testmu-browser-cloud page fill "@e3" "hello@test.com" --session $ID
testmu-browser-cloud page select "@e9" "option-2" --session $ID
testmu-browser-cloud page check "@e7" --session $ID
testmu-browser-cloud page uncheck "@e7" --session $ID
testmu-browser-cloud page hover "@e5" --session $ID
testmu-browser-cloud page drag "@e1" "@e2" --session $ID
testmu-browser-cloud page upload "@e3" "./file.pdf" --session $ID
```

**Navigation:**
```bash
testmu-browser-cloud page navigate "https://example.com" --session $ID
testmu-browser-cloud page back --session $ID
testmu-browser-cloud page forward --session $ID
testmu-browser-cloud page reload --session $ID
testmu-browser-cloud page wait "@e5" --session $ID
testmu-browser-cloud page wait 2000 --session $ID
```

**Queries:**
```bash
testmu-browser-cloud page get text "@e5" --session $ID
testmu-browser-cloud page get html "@e5" --session $ID
testmu-browser-cloud page get value "@e3" --session $ID
testmu-browser-cloud page get attr "@e5" "href" --session $ID
testmu-browser-cloud page get url --session $ID
testmu-browser-cloud page get title --session $ID
testmu-browser-cloud page get count "li.item" --session $ID
```

**State checks:**
```bash
testmu-browser-cloud page is visible "@e5" --session $ID
testmu-browser-cloud page is enabled "@e5" --session $ID
testmu-browser-cloud page is checked "@e7" --session $ID
```

**Find:**
```bash
testmu-browser-cloud page find role button --session $ID
testmu-browser-cloud page find text "Submit" --session $ID
testmu-browser-cloud page find label "Email" --session $ID
```

**Evaluate:**
```bash
testmu-browser-cloud page eval "document.title" --session $ID
```

**Session auto-detect:** When exactly one active session exists, `--session` can be omitted:
```bash
testmu-browser-cloud page snapshot  # auto-detects single active session
```

### 7.3 Output Format (Claude Code / Gemini CLI Optimized)

All commands return JSON by default (parseable by `jq`):

```json
{
  "success": true,
  "data": { ... }
}
```

With `--compact` flag, snapshot returns text format.

**Error output includes actionable context:**
```json
{
  "success": false,
  "error": "Element @e5 (button 'Submit') not found. Page may have changed. Run 'page snapshot' to refresh refs."
}
```

### 7.4 Typical Claude Code / Gemini CLI Workflow

```bash
# 1. Create session (local or cloud)
SESSION=$(testmu-browser-cloud session create --local | jq -r '.data.id')

# 2. Navigate
testmu-browser-cloud page navigate "https://app.example.com/login" --session $SESSION

# 3. Snapshot — LLM sees the page structure
testmu-browser-cloud page snapshot --compact --session $SESSION
# Output:
# [Login - Example App] https://app.example.com/login
# @e1 heading "Sign In"
# @e2 textbox "Email" value=""
# @e3 textbox "Password" value=""
# @e4 button "Sign In"
# @e5 link "Forgot password?"
# @e6 link "Create account"

# 4. LLM decides to fill the form
testmu-browser-cloud page fill "@e2" "user@example.com" --session $SESSION
testmu-browser-cloud page fill "@e3" "password123" --session $SESSION
testmu-browser-cloud page click "@e4" --session $SESSION

# 5. Snapshot again — check what happened
testmu-browser-cloud page snapshot --diff --compact --session $SESSION
# Output:
# [Dashboard - Example App] https://app.example.com/dashboard
# CHANGED: URL https://app.example.com/login → https://app.example.com/dashboard
# REMOVED: @e2 textbox "Email", @e3 textbox "Password", @e4 button "Sign In"
# ADDED: @e7 heading "Welcome back", @e8 link "Settings", @e9 button "Logout"

# 6. Continue interacting...
testmu-browser-cloud page click "@e8" --session $SESSION

# 7. Cleanup
testmu-browser-cloud session release $SESSION
```

---

## 8. SDK Integration (Zero Breaking Changes)

### 8.1 Browser Class Extension

```typescript
// src/testmu-cloud/index.ts — additions only

import { PageService } from './services/page-service.js';
import { SnapshotService } from './services/snapshot-service.js';
import { NetworkService } from './services/network-service.js';
import { InMemoryRefStore } from './stores/memory-ref-store.js';
import { InMemorySessionStore } from './stores/memory-session-store.js';
import { RefStore } from './stores/ref-store.js';
import { SessionStore } from './stores/session-store.js';

export class Browser {
    // ... all existing properties unchanged ...

    // NEW services (additive)
    public page: PageService;
    public snapshot: SnapshotService;
    public network: NetworkService;

    constructor(options?: { sessionStore?: SessionStore, refStore?: RefStore }) {
        // Existing initialization — unchanged, except SessionManager gets store
        this.sessionManager = new SessionManager(options?.sessionStore);
        // ... all other existing service initialization unchanged ...

        // NEW service initialization (order matters: SnapshotService before PageService)
        const refStore = options?.refStore || new InMemoryRefStore();
        this.snapshot = new SnapshotService(refStore);
        this.page = new PageService(this.snapshot, refStore);
        this.network = new NetworkService();
    }

    // ... all existing methods unchanged ...
}
```

### 8.2 New Type Exports

```typescript
// Added to types.ts — no existing types modified

export interface SnapshotOptions { ... }
export interface SnapshotNode { ... }
export interface SnapshotResult { ... }
export interface SnapshotDiff { ... }
export interface RefMapping { ... }
export interface RefStore { ... }
export interface SessionStore { ... }
```

### 8.3 Usage — Existing Users Unaffected

```typescript
// BEFORE: This still works exactly the same (zero changes needed)
const browser = new Browser();
const session = await browser.sessions.create({ local: true });
const page = await browser.puppeteer.connect(session);
await browser.sessions.computer(session.id, page, { action: 'click', coordinate: [100, 200] });

// AFTER: New capabilities available, but optional
browser.page.bind(page, session.id);              // bind once
const snap = await browser.page.snapshot(page);    // snapshot
await browser.page.click(page, '@e5');             // interact by ref
const text = await browser.page.getText(page, '@e5'); // query
```

### 8.4 Note on ComputerService

`ComputerService` remains Puppeteer-only (imports `Page` from `puppeteer-core`). `PageService` is the first interaction service to support both Puppeteer and Playwright, alongside `ContextService`. Future work may refactor `ComputerService` to use `PageService` internals for framework-agnostic coordinate actions.

---

## 9. MCP Server (Future — Same Services)

The MCP server would be a thin transport layer over the same services:

```typescript
// Future: src/mcp/index.ts
const server = new McpServer({ name: 'browser-cloud', version: '1.0.0' });
const browser = new Browser({ sessionStore: new DiskSessionStore(...), refStore: new DiskRefStore(...) });

server.tool('browser_snapshot', async ({ sessionId, compact }) => {
    const { page, cleanup } = await getSessionPage(sessionId);
    browser.page.bind(page, sessionId);
    try {
        return await browser.page.snapshot(page, { compact });
    } finally {
        await cleanup();
    }
});

server.tool('browser_click', async ({ sessionId, selector }) => {
    const { page, cleanup } = await getSessionPage(sessionId);
    browser.page.bind(page, sessionId);
    try {
        await browser.page.click(page, selector);
        return { success: true };
    } finally {
        await cleanup();
    }
});

// ... etc for all PageService methods
```

Same services, same ref system, different transport (MCP stdio vs CLI process).

---

## 10. File Structure

```
src/testmu-cloud/
├── utils/
│   └── framework-detect.ts       # NEW: shared Puppeteer/Playwright detection (~20 LOC)
├── stores/
│   ├── session-store.ts           # NEW: SessionStore interface (~30 LOC)
│   ├── memory-session-store.ts    # NEW: InMemorySessionStore (~50 LOC)
│   ├── disk-session-store.ts      # NEW: DiskSessionStore with atomic writes (~120 LOC)
│   ├── ref-store.ts               # NEW: RefStore interface (~30 LOC)
│   ├── memory-ref-store.ts        # NEW: InMemoryRefStore (~50 LOC)
│   └── disk-ref-store.ts          # NEW: DiskRefStore with atomic writes (~120 LOC)
├── services/
│   ├── snapshot-service.ts        # NEW: accessibility tree + @ref assignment (~500 LOC)
│   ├── page-service.ts            # NEW: selector interaction + queries + ref resolution (~600 LOC)
│   ├── network-service.ts         # NEW (Phase 2): request control (~150 LOC)
│   └── ... (existing services unchanged)
├── types.ts                       # Add new types (no modifications to existing)
└── index.ts                       # Add new service properties, optional constructor args

src/cli/
├── commands/
│   ├── page.ts                    # NEW: `page` subcommand with all sub-commands (~400 LOC)
│   └── ... (existing commands unchanged)
├── page-manager.ts                # NEW: dual-adapter connect-per-command helper (~150 LOC)
└── ... (existing CLI files unchanged)
```

---

## 11. Implementation Priority

| Phase | What | LOC | Weeks | Unlocks |
|-------|------|-----|-------|---------|
| **1a** | SessionStore interface + DiskSessionStore | ~300 | 1 | Fixes pre-existing CLI session bug |
| **1b** | RefStore interface + both implementations | ~300 | 0.5 | Foundation for @ref system |
| **1c** | SnapshotService (native accessibility API + locator generation + iframe support) | ~500 | 2-3 | Core @ref system, snapshot capture |
| **1d** | framework-detect utility + refactor ContextService | ~50 | 0.5 | Shared utility for all services |
| **1e** | PageService (interaction + queries + ref resolution) | ~600 | 1.5 | click, fill, getText, isVisible by @ref |
| **1f** | CLI page-manager (dual-adapter reconnection) | ~150 | 1 | CLI commands work across invocations |
| **1g** | CLI `page` subcommand (all commands) | ~400 | 1 | Full CLI parity |
| **2** | Snapshot diffing | ~200 | 0.5 | --diff flag |
| **3** | NetworkService + CLI (detailed design later) | ~200 | 0.5 | Request blocking, mocking |
| **4** | MCP server | ~300 | 1 | Direct LLM integration |
| **T** | Testing (unit + integration across Puppeteer/Playwright) | ~800 | 2 | Confidence + regression safety |
| | **Total** | **~3,800** | **~12 weeks** | |

---

## 12. Testing Strategy

### Unit Tests (~400 LOC)
- SnapshotService: tree processing, ref assignment, ref filtering, compact format generation
- RefStore: in-memory and disk save/load/get/clear, atomic write correctness
- SessionStore: in-memory and disk persistence, list filtering
- PageService: selector resolution (@ref vs CSS vs XPath), WeakMap binding, fallback chain
- framework-detect: Puppeteer page detection, Playwright page detection

### Integration Tests (~400 LOC, with real browsers)
- Snapshot a known HTML page → verify ref count, roles, names match expected
- Click @ref → verify element was clicked (check navigation or state change)
- Fill @ref → verify input value changed
- Query getText → verify correct text returned
- isVisible, isEnabled, isChecked → verify against known page state
- Diff after action → verify changes detected correctly
- **Same tests run on BOTH Puppeteer AND Playwright** (parameterized)
- Iframe snapshot → verify cross-frame elements appear with frameId

### CLI Tests (~200 LOC)
- Round-trip: `session create` → `page navigate` → `page snapshot` → `page click @ref` → `page snapshot --diff` → `session release`
- Verify JSON output format matches spec
- Verify compact output format matches spec
- Verify error messages for: invalid refs, stale refs, no session, no snapshot taken yet
- Verify `--session` auto-detect with single active session

---

## 13. Resolved Review Findings

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | CLI click/type/scroll command name collision | CRITICAL | New commands under `page` subcommand (Section 7.2) |
| 2 | SessionStore is in-memory, CLI page-manager won't work | CRITICAL | SessionStore interface with InMemory + Disk implementations (Section 6) |
| 3 | DOM walk instead of native accessibility API | CRITICAL | Two-phase: native `page.accessibility.snapshot()` + `page.evaluate()` for locators only (Section 4.1) |
| 4 | No Playwright reconnection path in CLI | HIGH | Dual-adapter page-manager with adapter type in session.json (Section 7.1) |
| 5 | No iframe/shadow DOM handling | HIGH | iframe via `page.frames()`, open shadow DOM via native accessibility API (Section 4.4) |
| 6 | Ref assignment doesn't filter per rules | HIGH | `REF_ELIGIBLE_ROLES` set with `shouldAssignRef()` check (Section 4.3) |
| 7 | sessionId on every PageService method | HIGH | WeakMap binding via `page.bind()`, called once (Section 3.3) |
| 8 | detectFramework duplicated | MEDIUM | Extracted to `utils/framework-detect.ts` (Section 3.4) |
| 9 | Playwright accessibility API deprecated | MEDIUM | Migration note added, use deprecated API for now (Section 4.1) |
| 10 | RefStore needs dual implementations | MEDIUM | RefStore interface with InMemory + Disk (Section 4.5) |
| 11 | Security: file permissions, cleanup | MEDIUM | `0600` permissions, 24hr TTL cleanup, atomic writes (Section 4.5) |
| 12 | Disk writes not atomic | MEDIUM | Write-to-temp-then-rename pattern (Sections 4.5, 6.1) |
| 13 | Effort estimates undercount | MEDIUM | Revised from 6-7 weeks to ~12 weeks (Section 11) |
| 14 | NetworkService underspecified | LOW | Marked as Phase 3, detailed design deferred (Section 3.2) |
| 15 | ComputerService is Puppeteer-only | LOW | Documented asymmetry, noted for future work (Section 8.4) |

---

## 14. Open Questions

1. **Selenium adapter support** — Should PageService work with Selenium WebDriver pages? Selenium doesn't have `page.evaluate()` or `page.accessibility.snapshot()`. **Recommendation:** defer, focus on Puppeteer/Playwright first.

2. **Ref stability across navigations** — When the user navigates to a new page, old refs become invalid. **Decision:** Auto-invalidate with clear error message. User must run `page snapshot` after navigation.

3. **Max ref count** — Pages like Gmail can have 1000+ interactive elements. **Decision:** Default cap at 500 with `--max-elements` override. Warning in output when truncated.

4. **Compact format standard** — Should the compact text format follow agent-browser's exact format? **Decision:** Yes, maximize ecosystem compatibility.

5. **Session auto-detect** — Should `--session` be optional when exactly one session is active? **Decision:** Yes. Error if 0 or 2+ sessions and no `--session` provided.

6. **Playwright `ariaSnapshot()` migration** — When should we migrate from deprecated `page.accessibility.snapshot()` to `locator.ariaSnapshot()`? **Decision:** Track Playwright releases. Migrate when the deprecated API is removed or when `ariaSnapshot()` provides significantly better data.
