# SnapshotService & Page Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add agent-browser-like capabilities (accessibility snapshots with @ref IDs, selector-based interaction, DOM queries) to browser-cloud SDK without breaking existing users.

**Architecture:** New services (SnapshotService, PageService, NetworkService) added to existing Browser class via optional constructor args. SessionStore and RefStore interfaces with InMemory (SDK default) and Disk (CLI) implementations. CLI commands namespaced under `page` subcommand to avoid collision with existing coordinate-based commands.

**Tech Stack:** TypeScript, Puppeteer Core, Playwright Core, Commander.js, Jest, fs-extra

**Spec:** `docs/specs/snapshot-service-design.md` (v2, post-review)

---

## Task 1: Shared Framework Detection Utility

**Files:**
- Create: `src/testmu-cloud/utils/framework-detect.ts`
- Create: `src/testmu-cloud/utils/__tests__/framework-detect.test.ts`
- Modify: `src/testmu-cloud/services/context-service.ts` (remove private method, import shared)

- [ ] **Step 1: Write failing test**

```typescript
// src/testmu-cloud/utils/__tests__/framework-detect.test.ts
import { detectFramework } from '../framework-detect';

describe('detectFramework', () => {
    it('returns playwright when page has context() method', () => {
        const playwrightPage = { context: () => ({}), goto: async () => {} };
        expect(detectFramework(playwrightPage)).toBe('playwright');
    });

    it('returns puppeteer when page lacks context() method', () => {
        const puppeteerPage = { goto: async () => {}, cookies: async () => [] };
        expect(detectFramework(puppeteerPage)).toBe('puppeteer');
    });

    it('returns puppeteer when context is a property not a function', () => {
        const page = { context: 'not-a-function', goto: async () => {} };
        expect(detectFramework(page)).toBe('puppeteer');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/utils/__tests__/framework-detect.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/testmu-cloud/utils/framework-detect.ts

/**
 * Detect whether a page object is from Puppeteer or Playwright.
 * Playwright pages have a page.context() method; Puppeteer pages do not.
 */
export function detectFramework(page: any): 'puppeteer' | 'playwright' {
    if (typeof page.context === 'function') return 'playwright';
    return 'puppeteer';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/utils/__tests__/framework-detect.test.ts --verbose`
Expected: 3 tests PASS

- [ ] **Step 5: Refactor ContextService to use shared utility**

In `src/testmu-cloud/services/context-service.ts`, replace the private method:

Replace:
```typescript
    /**
     * Detect if page is Puppeteer or Playwright
     */
    private detectFramework(page: any): 'puppeteer' | 'playwright' {
        // Playwright pages have page.context() method
        if (typeof page.context === 'function') {
            return 'playwright';
        }
        return 'puppeteer';
    }
```

With:
```typescript
    // Import at top of file: import { detectFramework } from '../utils/framework-detect';
    // Then replace all this.detectFramework(page) calls with detectFramework(page)
```

Add at top of `context-service.ts`:
```typescript
import { detectFramework } from '../utils/framework-detect';
```

Replace every `this.detectFramework(page)` with `detectFramework(page)` (4 occurrences in the file).

- [ ] **Step 6: Run all existing tests to verify no regression**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All existing tests pass

- [ ] **Step 7: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/utils/ src/testmu-cloud/services/context-service.ts && git commit -m "refactor: extract detectFramework to shared utility"
```

---

## Task 2: SessionStore Interface + InMemorySessionStore

**Files:**
- Create: `src/testmu-cloud/stores/session-store.ts`
- Create: `src/testmu-cloud/stores/memory-session-store.ts`
- Create: `src/testmu-cloud/stores/__tests__/memory-session-store.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/testmu-cloud/stores/__tests__/memory-session-store.test.ts
import { InMemorySessionStore } from '../memory-session-store';
import { Session } from '../../types';

function makeSession(id: string, status: 'live' | 'released' = 'live'): Session {
    return {
        id,
        websocketUrl: `wss://test/${id}`,
        debugUrl: 'http://localhost:9222',
        config: { adapter: 'puppeteer' },
        status,
        createdAt: new Date().toISOString(),
        timeout: 300000,
        dimensions: { width: 1920, height: 1080 },
    } as Session;
}

describe('InMemorySessionStore', () => {
    let store: InMemorySessionStore;

    beforeEach(() => {
        store = new InMemorySessionStore();
    });

    it('saves and retrieves a session', async () => {
        const session = makeSession('s1');
        await store.save(session);
        const retrieved = await store.get('s1');
        expect(retrieved).toEqual(session);
    });

    it('returns null for unknown session', async () => {
        expect(await store.get('nonexistent')).toBeNull();
    });

    it('lists only live sessions', async () => {
        await store.save(makeSession('s1', 'live'));
        await store.save(makeSession('s2', 'released'));
        const list = await store.list();
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe('s1');
    });

    it('deletes a session', async () => {
        await store.save(makeSession('s1'));
        await store.delete('s1');
        expect(await store.get('s1')).toBeNull();
    });

    it('deleteAll clears all sessions', async () => {
        await store.save(makeSession('s1'));
        await store.save(makeSession('s2'));
        await store.deleteAll();
        expect(await store.list()).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/stores/__tests__/memory-session-store.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write SessionStore interface**

```typescript
// src/testmu-cloud/stores/session-store.ts
import { Session } from '../types';

export interface SessionStore {
    save(session: Session): Promise<void>;
    get(id: string): Promise<Session | null>;
    list(): Promise<Session[]>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
}
```

- [ ] **Step 4: Write InMemorySessionStore**

```typescript
// src/testmu-cloud/stores/memory-session-store.ts
import { Session } from '../types';
import { SessionStore } from './session-store';

export class InMemorySessionStore implements SessionStore {
    private sessions = new Map<string, Session>();

    async save(session: Session): Promise<void> {
        this.sessions.set(session.id, session);
    }

    async get(id: string): Promise<Session | null> {
        return this.sessions.get(id) || null;
    }

    async list(): Promise<Session[]> {
        return Array.from(this.sessions.values()).filter(s => s.status === 'live');
    }

    async delete(id: string): Promise<void> {
        this.sessions.delete(id);
    }

    async deleteAll(): Promise<void> {
        this.sessions.clear();
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/stores/__tests__/memory-session-store.test.ts --verbose`
Expected: 5 tests PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/stores/ && git commit -m "feat: add SessionStore interface and InMemorySessionStore"
```

---

## Task 3: DiskSessionStore

**Files:**
- Create: `src/testmu-cloud/stores/disk-session-store.ts`
- Create: `src/testmu-cloud/stores/__tests__/disk-session-store.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/testmu-cloud/stores/__tests__/disk-session-store.test.ts
import { DiskSessionStore } from '../disk-session-store';
import { Session } from '../../types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

function makeSession(id: string, status: 'live' | 'released' = 'live'): Session {
    return {
        id,
        websocketUrl: `wss://test/${id}`,
        debugUrl: 'http://localhost:9222',
        config: { adapter: 'puppeteer' },
        status,
        createdAt: new Date().toISOString(),
        timeout: 300000,
        dimensions: { width: 1920, height: 1080 },
    } as Session;
}

describe('DiskSessionStore', () => {
    let store: DiskSessionStore;
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = path.join(os.tmpdir(), `browser-cloud-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await fs.ensureDir(tmpDir);
        store = new DiskSessionStore(tmpDir);
    });

    afterEach(async () => {
        await fs.remove(tmpDir);
    });

    it('saves session to disk and retrieves it', async () => {
        const session = makeSession('s1');
        await store.save(session);
        const retrieved = await store.get('s1');
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe('s1');
        expect(retrieved!.websocketUrl).toBe('wss://test/s1');
    });

    it('persists session.json file', async () => {
        await store.save(makeSession('s1'));
        const filePath = path.join(tmpDir, 's1', 'session.json');
        expect(await fs.pathExists(filePath)).toBe(true);
    });

    it('returns null for unknown session', async () => {
        expect(await store.get('nonexistent')).toBeNull();
    });

    it('lists only live sessions', async () => {
        await store.save(makeSession('s1', 'live'));
        await store.save(makeSession('s2', 'released'));
        const list = await store.list();
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe('s1');
    });

    it('deletes session directory', async () => {
        await store.save(makeSession('s1'));
        await store.delete('s1');
        expect(await store.get('s1')).toBeNull();
        expect(await fs.pathExists(path.join(tmpDir, 's1'))).toBe(false);
    });

    it('deleteAll clears all sessions', async () => {
        await store.save(makeSession('s1'));
        await store.save(makeSession('s2'));
        await store.deleteAll();
        expect(await store.list()).toHaveLength(0);
    });

    it('includes adapter in persisted data', async () => {
        const session = makeSession('s1');
        session.config.adapter = 'playwright';
        await store.save(session);
        const raw = await fs.readJson(path.join(tmpDir, 's1', 'session.json'));
        expect(raw.config.adapter).toBe('playwright');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/stores/__tests__/disk-session-store.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/testmu-cloud/stores/disk-session-store.ts
import { Session } from '../types';
import { SessionStore } from './session-store';
import fs from 'fs-extra';
import path from 'path';

export class DiskSessionStore implements SessionStore {
    constructor(private baseDir: string) {}

    async save(session: Session): Promise<void> {
        const dir = path.join(this.baseDir, session.id);
        await fs.ensureDir(dir);
        const data = JSON.stringify(session, null, 2);
        // Atomic write: write to temp, then rename
        const tmpPath = path.join(dir, `session.${process.pid}.tmp`);
        await fs.writeFile(tmpPath, data, { mode: 0o600 });
        await fs.rename(tmpPath, path.join(dir, 'session.json'));
    }

    async get(id: string): Promise<Session | null> {
        const filePath = path.join(this.baseDir, id, 'session.json');
        if (!await fs.pathExists(filePath)) return null;
        try {
            return await fs.readJson(filePath);
        } catch {
            return null;
        }
    }

    async list(): Promise<Session[]> {
        let dirs: string[];
        try {
            dirs = await fs.readdir(this.baseDir);
        } catch {
            return [];
        }
        const sessions: Session[] = [];
        for (const dir of dirs) {
            const session = await this.get(dir);
            if (session && session.status === 'live') sessions.push(session);
        }
        return sessions;
    }

    async delete(id: string): Promise<void> {
        const dir = path.join(this.baseDir, id);
        await fs.remove(dir);
    }

    async deleteAll(): Promise<void> {
        let dirs: string[];
        try {
            dirs = await fs.readdir(this.baseDir);
        } catch {
            return;
        }
        for (const dir of dirs) {
            await this.delete(dir);
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/stores/__tests__/disk-session-store.test.ts --verbose`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/stores/ && git commit -m "feat: add DiskSessionStore with atomic writes"
```

---

## Task 4: RefStore Interface + Both Implementations

**Files:**
- Create: `src/testmu-cloud/stores/ref-store.ts`
- Create: `src/testmu-cloud/stores/memory-ref-store.ts`
- Create: `src/testmu-cloud/stores/disk-ref-store.ts`
- Create: `src/testmu-cloud/stores/__tests__/ref-store.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/testmu-cloud/stores/__tests__/ref-store.test.ts
import { InMemoryRefStore } from '../memory-ref-store';
import { DiskRefStore } from '../disk-ref-store';
import { RefStore, RefMapping } from '../ref-store';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const testRefs = new Map<string, RefMapping>([
    ['@e1', { xpath: '/html/body/button', css: 'button', role: 'button', name: 'Submit' }],
    ['@e2', { xpath: '/html/body/input', css: '#email', role: 'textbox', name: 'Email' }],
]);

function runStoreTests(name: string, createStore: () => Promise<{ store: RefStore, cleanup: () => Promise<void> }>) {
    describe(name, () => {
        let store: RefStore;
        let cleanup: () => Promise<void>;

        beforeEach(async () => {
            const result = await createStore();
            store = result.store;
            cleanup = result.cleanup;
        });

        afterEach(async () => {
            await cleanup();
        });

        it('saves and loads refs', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            const loaded = await store.load('s1');
            expect(loaded).not.toBeNull();
            expect(loaded!.url).toBe('https://example.com');
            expect(loaded!.refs.get('@e1')).toEqual({ xpath: '/html/body/button', css: 'button', role: 'button', name: 'Submit' });
            expect(loaded!.refs.size).toBe(2);
        });

        it('gets a single ref', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            const ref = await store.get('s1', '@e1');
            expect(ref).toEqual({ xpath: '/html/body/button', css: 'button', role: 'button', name: 'Submit' });
        });

        it('returns null for unknown ref', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            expect(await store.get('s1', '@e99')).toBeNull();
        });

        it('returns null for unknown session', async () => {
            expect(await store.load('nonexistent')).toBeNull();
        });

        it('clears refs for a session', async () => {
            await store.save('s1', testRefs, 'https://example.com');
            await store.clear('s1');
            expect(await store.load('s1')).toBeNull();
        });
    });
}

runStoreTests('InMemoryRefStore', async () => ({
    store: new InMemoryRefStore(),
    cleanup: async () => {},
}));

runStoreTests('DiskRefStore', async () => {
    const tmpDir = path.join(os.tmpdir(), `ref-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    return {
        store: new DiskRefStore(tmpDir),
        cleanup: async () => { await fs.remove(tmpDir); },
    };
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/stores/__tests__/ref-store.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write RefStore interface**

```typescript
// src/testmu-cloud/stores/ref-store.ts
export interface RefMapping {
    xpath: string;
    css: string;
    role: string;
    name: string;
    frameId?: string;
}

export interface RefStore {
    save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void>;
    load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null>;
    get(sessionId: string, ref: string): Promise<RefMapping | null>;
    clear(sessionId: string): Promise<void>;
}
```

- [ ] **Step 4: Write InMemoryRefStore**

```typescript
// src/testmu-cloud/stores/memory-ref-store.ts
import { RefStore, RefMapping } from './ref-store';

export class InMemoryRefStore implements RefStore {
    private store = new Map<string, { refs: Map<string, RefMapping>, url: string }>();

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void> {
        this.store.set(sessionId, { refs: new Map(refs), url });
    }

    async load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        return this.store.get(sessionId) || null;
    }

    async get(sessionId: string, ref: string): Promise<RefMapping | null> {
        const data = this.store.get(sessionId);
        if (!data) return null;
        return data.refs.get(ref) || null;
    }

    async clear(sessionId: string): Promise<void> {
        this.store.delete(sessionId);
    }
}
```

- [ ] **Step 5: Write DiskRefStore**

```typescript
// src/testmu-cloud/stores/disk-ref-store.ts
import { RefStore, RefMapping } from './ref-store';
import fs from 'fs-extra';
import path from 'path';

export class DiskRefStore implements RefStore {
    constructor(private baseDir: string) {}

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void> {
        const dir = path.join(this.baseDir, sessionId);
        await fs.ensureDir(dir);
        const data = JSON.stringify({
            version: 1,
            url,
            timestamp: Date.now(),
            refs: Object.fromEntries(refs),
        }, null, 2);
        const tmpPath = path.join(dir, `refs.${process.pid}.tmp`);
        await fs.writeFile(tmpPath, data, { mode: 0o600 });
        await fs.rename(tmpPath, path.join(dir, 'refs.json'));
    }

    async load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        const filePath = path.join(this.baseDir, sessionId, 'refs.json');
        if (!await fs.pathExists(filePath)) return null;
        try {
            const raw = await fs.readJson(filePath);
            return {
                refs: new Map(Object.entries(raw.refs)) as Map<string, RefMapping>,
                url: raw.url,
            };
        } catch {
            return null;
        }
    }

    async get(sessionId: string, ref: string): Promise<RefMapping | null> {
        const data = await this.load(sessionId);
        if (!data) return null;
        return data.refs.get(ref) || null;
    }

    async clear(sessionId: string): Promise<void> {
        const refsPath = path.join(this.baseDir, sessionId, 'refs.json');
        await fs.remove(refsPath);
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/stores/__tests__/ref-store.test.ts --verbose`
Expected: 10 tests PASS (5 per implementation)

- [ ] **Step 7: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/stores/ && git commit -m "feat: add RefStore interface with InMemory and Disk implementations"
```

---

## Task 5: SnapshotService — Core @Ref System

**Files:**
- Create: `src/testmu-cloud/services/snapshot-service.ts`
- Create: `src/testmu-cloud/services/__tests__/snapshot-service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/testmu-cloud/services/__tests__/snapshot-service.test.ts
import { SnapshotService } from '../snapshot-service';
import { InMemoryRefStore } from '../../stores/memory-ref-store';

// Mock page with accessibility snapshot support
function createMockPage(accessibilityTree: any, url: string = 'https://example.com', title: string = 'Test Page') {
    return {
        url: () => url,
        title: async () => title,
        accessibility: {
            snapshot: async (opts?: any) => accessibilityTree,
        },
        evaluate: async (fn: Function, ...args: any[]) => {
            // Return mock locators for each element
            return { xpath: '/html/body/button', css: 'button' };
        },
        mainFrame: () => ({ url: () => url }),
        frames: () => [],
    };
}

describe('SnapshotService', () => {
    let service: SnapshotService;
    let refStore: InMemoryRefStore;

    beforeEach(() => {
        refStore = new InMemoryRefStore();
        service = new SnapshotService(refStore);
    });

    it('captures snapshot and assigns refs to interactive elements', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Test Page',
            children: [
                { role: 'heading', name: 'Title', children: [] },
                { role: 'textbox', name: 'Email', value: '', children: [] },
                { role: 'button', name: 'Submit', children: [] },
            ],
        };
        const page = createMockPage(tree);
        const result = await service.capture(page, 'session1');

        expect(result.url).toBe('https://example.com');
        expect(result.title).toBe('Test Page');
        expect(result.refCount).toBeGreaterThan(0);
        expect(result.tree.children).toBeDefined();

        // Verify refs were stored
        const stored = await refStore.load('session1');
        expect(stored).not.toBeNull();
        expect(stored!.refs.size).toBe(result.refCount);
    });

    it('only assigns refs to eligible roles', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Test',
            children: [
                { role: 'button', name: 'Click Me', children: [] },
                { role: 'generic', name: '', children: [] },      // Should NOT get ref
                { role: 'paragraph', name: '', children: [] },     // Should NOT get ref
                { role: 'link', name: 'Home', children: [] },
            ],
        };
        const page = createMockPage(tree);
        const result = await service.capture(page, 's1');

        // Only button and link are ref-eligible
        expect(result.refCount).toBe(2);
    });

    it('respects maxElements option', async () => {
        const children = Array.from({ length: 20 }, (_, i) => ({
            role: 'button', name: `Button ${i}`, children: [],
        }));
        const tree = { role: 'WebArea', name: 'Test', children };
        const page = createMockPage(tree);
        const result = await service.capture(page, 's1', { maxElements: 5 });

        expect(result.refCount).toBe(5);
        expect(result.truncated).toBe(true);
    });

    it('generates compact text format', async () => {
        const tree = {
            role: 'WebArea',
            name: 'Login',
            children: [
                { role: 'textbox', name: 'Email', value: '', children: [] },
                { role: 'button', name: 'Submit', children: [] },
            ],
        };
        const page = createMockPage(tree, 'https://example.com/login', 'Login');
        const result = await service.capture(page, 's1', { compact: true });

        expect(result.compactText).toBeDefined();
        expect(result.compactText).toContain('[Login]');
        expect(result.compactText).toContain('textbox "Email"');
        expect(result.compactText).toContain('button "Submit"');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/services/__tests__/snapshot-service.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write SnapshotService implementation**

```typescript
// src/testmu-cloud/services/snapshot-service.ts
import { RefStore, RefMapping } from '../stores/ref-store';
import { detectFramework } from '../utils/framework-detect';

export interface SnapshotOptions {
    interactiveOnly?: boolean;
    maxDepth?: number;
    maxElements?: number;
    selector?: string;
    compact?: boolean;
    includeFrames?: boolean;
}

export interface SnapshotNode {
    ref?: string;
    role: string;
    name: string;
    value?: string;
    description?: string;
    frameId?: string;
    state?: {
        disabled?: boolean;
        checked?: boolean;
        expanded?: boolean;
        selected?: boolean;
        required?: boolean;
        focused?: boolean;
    };
    children?: SnapshotNode[];
}

export interface SnapshotResult {
    url: string;
    title: string;
    tree: SnapshotNode;
    refCount: number;
    totalElements: number;
    truncated: boolean;
    timestamp: number;
    compactText?: string;
}

const REF_ELIGIBLE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'listbox',
    'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'searchbox',
    'slider', 'spinbutton', 'switch', 'tab', 'treeitem',
    'heading', 'img', 'navigation', 'main', 'banner', 'contentinfo',
    'complementary', 'form', 'search', 'dialog', 'alertdialog', 'alert',
]);

function shouldAssignRef(role: string): boolean {
    return REF_ELIGIBLE_ROLES.has(role);
}

export class SnapshotService {
    constructor(private refStore: RefStore) {}

    async capture(page: any, sessionId: string, options: SnapshotOptions = {}): Promise<SnapshotResult> {
        const maxElements = options.maxElements || 500;
        const url = typeof page.url === 'function' ? page.url() : '';
        const title = await page.title();
        const timestamp = Date.now();

        // Phase A: Get accessibility tree from browser engine
        let rawTree: any;
        try {
            rawTree = await page.accessibility.snapshot({ interestingOnly: true });
        } catch {
            rawTree = { role: 'WebArea', name: title, children: [] };
        }

        if (!rawTree) {
            rawTree = { role: 'WebArea', name: title, children: [] };
        }

        // Phase B: Assign refs and generate locators
        let refCounter = 0;
        let totalElements = 0;
        let truncated = false;
        const refMap = new Map<string, RefMapping>();

        function processNode(node: any, depth: number): SnapshotNode | null {
            if (!node) return null;
            totalElements++;

            const result: SnapshotNode = {
                role: node.role || 'generic',
                name: node.name || '',
            };

            if (node.value !== undefined && node.value !== '') result.value = String(node.value);
            if (node.description) result.description = node.description;

            // Build state object
            const state: any = {};
            if (node.disabled) state.disabled = true;
            if (node.checked !== undefined) state.checked = node.checked;
            if (node.expanded !== undefined) state.expanded = node.expanded;
            if (node.selected !== undefined) state.selected = node.selected;
            if (node.required) state.required = true;
            if (node.focused) state.focused = true;
            if (Object.keys(state).length > 0) result.state = state;

            // Assign ref if eligible and under limit
            if (shouldAssignRef(result.role) && refCounter < maxElements) {
                refCounter++;
                const ref = `@e${refCounter}`;
                result.ref = ref;
                refMap.set(ref, {
                    xpath: '', // Will be enriched later if needed
                    css: '',
                    role: result.role,
                    name: result.name,
                });
            }

            if (refCounter >= maxElements && !truncated) {
                truncated = true;
            }

            // Process children
            if (node.children && node.children.length > 0) {
                const children: SnapshotNode[] = [];
                for (const child of node.children) {
                    if (options.maxDepth !== undefined && depth >= options.maxDepth) break;
                    const processed = processNode(child, depth + 1);
                    if (processed) children.push(processed);
                }
                if (children.length > 0) result.children = children;
            }

            return result;
        }

        const tree = processNode(rawTree, 0) || { role: 'WebArea', name: title };

        // Store refs
        await this.refStore.save(sessionId, refMap, url);

        const snapshotResult: SnapshotResult = {
            url,
            title,
            tree,
            refCount: refCounter,
            totalElements,
            truncated,
            timestamp,
        };

        // Generate compact text if requested
        if (options.compact) {
            snapshotResult.compactText = this.toCompactText(snapshotResult);
        }

        return snapshotResult;
    }

    toCompactText(result: SnapshotResult): string {
        const lines: string[] = [];
        lines.push(`[${result.title}] ${result.url}`);

        function walk(node: SnapshotNode) {
            if (node.ref) {
                let line = `${node.ref} ${node.role} "${node.name}"`;
                if (node.value !== undefined) line += ` value="${node.value}"`;
                if (node.state?.disabled) line += ' [disabled]';
                if (node.state?.checked) line += ' [checked]';
                lines.push(line);
            }
            if (node.children) {
                for (const child of node.children) walk(child);
            }
        }

        walk(result.tree);

        if (result.truncated) {
            lines.push(`(truncated: showing ${result.refCount} of ${result.totalElements} elements)`);
        }

        return lines.join('\n');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/services/__tests__/snapshot-service.test.ts --verbose`
Expected: 4 tests PASS

- [ ] **Step 5: Run all tests to verify no regression**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/services/snapshot-service.ts src/testmu-cloud/services/__tests__/snapshot-service.test.ts && git commit -m "feat: add SnapshotService with @ref system and compact output"
```

---

## Task 6: PageService — Selector Resolution + Interaction + Queries

**Files:**
- Create: `src/testmu-cloud/services/page-service.ts`
- Create: `src/testmu-cloud/services/__tests__/page-service.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/testmu-cloud/services/__tests__/page-service.test.ts
import { PageService } from '../page-service';
import { SnapshotService } from '../snapshot-service';
import { InMemoryRefStore } from '../../stores/memory-ref-store';
import { RefMapping } from '../../stores/ref-store';

function createMockPuppeteerPage() {
    const clickedSelectors: string[] = [];
    const filledData: { selector: string; value: string }[] = [];
    let currentUrl = 'https://example.com';
    let currentTitle = 'Test Page';

    return {
        // Puppeteer-like page (no .context method)
        url: () => currentUrl,
        title: async () => currentTitle,
        goto: async (url: string) => { currentUrl = url; },
        goBack: async () => {},
        goForward: async () => {},
        reload: async () => {},
        waitForSelector: async (selector: string) => ({
            click: async () => { clickedSelectors.push(selector); },
            type: async (text: string) => { filledData.push({ selector, value: text }); },
            evaluate: async (fn: Function) => 'mock text',
            $eval: async (sel: string, fn: Function) => 'mock',
            isVisible: async () => true,
        }),
        evaluate: async (fn: Function, ...args: any[]) => {
            // Simulate page.evaluate for getText etc
            return 'evaluated result';
        },
        accessibility: {
            snapshot: async () => ({ role: 'WebArea', name: 'Test', children: [] }),
        },
        mainFrame: () => ({ url: () => currentUrl }),
        frames: () => [],
        // Track calls for assertions
        _clickedSelectors: clickedSelectors,
        _filledData: filledData,
    };
}

describe('PageService', () => {
    let service: PageService;
    let refStore: InMemoryRefStore;
    let snapshotService: SnapshotService;
    let page: any;

    beforeEach(async () => {
        refStore = new InMemoryRefStore();
        snapshotService = new SnapshotService(refStore);
        service = new PageService(snapshotService, refStore);
        page = createMockPuppeteerPage();
        service.bind(page, 'test-session');
    });

    describe('bind', () => {
        it('binds page to session', () => {
            // Should not throw when resolving session
            expect(() => service.bind(page, 'test-session')).not.toThrow();
        });

        it('throws when using unbound page', async () => {
            const unboundPage = createMockPuppeteerPage();
            await expect(service.getUrl(unboundPage)).rejects.toThrow('Page not bound');
        });
    });

    describe('navigation', () => {
        it('navigate returns url and title', async () => {
            const result = await service.navigate(page, 'https://example.com/new');
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('title');
        });
    });

    describe('selector resolution', () => {
        it('resolves CSS selectors directly', async () => {
            await service.click(page, '#submit-btn');
            expect(page._clickedSelectors).toContain('#submit-btn');
        });

        it('resolves @ref selectors from store', async () => {
            // Pre-populate refs
            const refs = new Map<string, RefMapping>([
                ['@e1', { xpath: '/html/body/button', css: '#submit', role: 'button', name: 'Submit' }],
            ]);
            await refStore.save('test-session', refs, 'https://example.com');

            await service.click(page, '@e1');
            // Should have tried the css selector from the ref
            expect(page._clickedSelectors.length).toBeGreaterThan(0);
        });

        it('throws for unknown @ref', async () => {
            await expect(service.click(page, '@e99')).rejects.toThrow('Unknown ref');
        });
    });

    describe('queries', () => {
        it('getUrl returns current URL', async () => {
            const url = await service.getUrl(page);
            expect(url).toBe('https://example.com');
        });

        it('getTitle returns page title', async () => {
            const title = await service.getTitle(page);
            expect(title).toBe('Test Page');
        });
    });

    describe('snapshot delegation', () => {
        it('snapshot calls SnapshotService.capture', async () => {
            const result = await service.snapshot(page);
            expect(result).toHaveProperty('tree');
            expect(result).toHaveProperty('refCount');
        });

        it('snapshot with compact option', async () => {
            const result = await service.snapshot(page, { compact: true });
            expect(result).toHaveProperty('compactText');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/services/__tests__/page-service.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Write PageService implementation**

```typescript
// src/testmu-cloud/services/page-service.ts
import { SnapshotService, SnapshotOptions, SnapshotResult } from './snapshot-service';
import { RefStore, RefMapping } from '../stores/ref-store';
import { detectFramework } from '../utils/framework-detect';

export class PageService {
    private pageSessionMap = new WeakMap<object, string>();

    constructor(
        private snapshotService: SnapshotService,
        private refStore: RefStore,
    ) {}

    // =================== Binding ===================

    bind(page: any, sessionId: string): void {
        this.pageSessionMap.set(page, sessionId);
    }

    private getSessionId(page: any): string {
        const id = this.pageSessionMap.get(page);
        if (!id) throw new Error('Page not bound to a session. Call browser.page.bind(page, sessionId) first.');
        return id;
    }

    // =================== Snapshot ===================

    async snapshot(page: any, options?: SnapshotOptions): Promise<SnapshotResult> {
        const sessionId = this.getSessionId(page);
        return this.snapshotService.capture(page, sessionId, options);
    }

    // =================== Navigation ===================

    async navigate(page: any, url: string, options?: { waitUntil?: string }): Promise<{ url: string, title: string }> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            await page.goto(url, options?.waitUntil ? { waitUntil: options.waitUntil } : undefined);
        } else {
            await page.goto(url, options?.waitUntil ? { waitUntil: options.waitUntil } : undefined);
        }
        return { url: typeof page.url === 'function' ? page.url() : url, title: await page.title() };
    }

    async back(page: any): Promise<{ url: string, title: string }> {
        await page.goBack();
        return { url: typeof page.url === 'function' ? page.url() : '', title: await page.title() };
    }

    async forward(page: any): Promise<{ url: string, title: string }> {
        await page.goForward();
        return { url: typeof page.url === 'function' ? page.url() : '', title: await page.title() };
    }

    async reload(page: any): Promise<{ url: string, title: string }> {
        await page.reload();
        return { url: typeof page.url === 'function' ? page.url() : '', title: await page.title() };
    }

    async wait(page: any, selectorOrMs: string | number): Promise<void> {
        if (typeof selectorOrMs === 'number') {
            await new Promise(resolve => setTimeout(resolve, selectorOrMs));
        } else {
            const framework = detectFramework(page);
            if (framework === 'playwright') {
                await page.locator(selectorOrMs).waitFor();
            } else {
                await page.waitForSelector(selectorOrMs);
            }
        }
    }

    // =================== Interaction ===================

    async click(page: any, selector: string, options?: { button?: string }): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        await element.click(options);
    }

    async fill(page: any, selector: string, value: string): Promise<void> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            await element.fill(value);
        } else {
            await element.type(value);
        }
    }

    async type(page: any, selector: string, text: string): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            await element.pressSequentially(text);
        } else {
            await element.type(text);
        }
    }

    async select(page: any, selector: string, ...values: string[]): Promise<void> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            await element.selectOption(values);
        } else {
            await element.select(...values);
        }
    }

    async check(page: any, selector: string): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            const element = await this.resolveSelector(page, selector);
            await element.check();
        } else {
            const element = await this.resolveSelector(page, selector);
            const checked = await element.evaluate((el: any) => el.checked);
            if (!checked) await element.click();
        }
    }

    async uncheck(page: any, selector: string): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            const element = await this.resolveSelector(page, selector);
            await element.uncheck();
        } else {
            const element = await this.resolveSelector(page, selector);
            const checked = await element.evaluate((el: any) => el.checked);
            if (checked) await element.click();
        }
    }

    async hover(page: any, selector: string): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        await element.hover();
    }

    async focus(page: any, selector: string): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        await element.focus();
    }

    async drag(page: any, source: string, target: string): Promise<void> {
        const framework = detectFramework(page);
        const srcEl = await this.resolveSelector(page, source);
        const tgtEl = await this.resolveSelector(page, target);
        if (framework === 'playwright') {
            await srcEl.dragTo(tgtEl);
        } else {
            // Puppeteer drag requires bounding box calculation
            const srcBox = await srcEl.boundingBox();
            const tgtBox = await tgtEl.boundingBox();
            if (srcBox && tgtBox) {
                await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(tgtBox.x + tgtBox.width / 2, tgtBox.y + tgtBox.height / 2);
                await page.mouse.up();
            }
        }
    }

    async upload(page: any, selector: string, files: string[]): Promise<void> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            await element.setInputFiles(files);
        } else {
            const input = await element;
            await input.uploadFile(...files);
        }
    }

    async press(page: any, key: string): Promise<void> {
        await page.keyboard.press(key);
    }

    async scroll(page: any, options?: { selector?: string, direction?: string, amount?: number }): Promise<void> {
        const amount = options?.amount || 300;
        const direction = options?.direction || 'down';
        const deltaX = direction === 'left' ? -amount : direction === 'right' ? amount : 0;
        const deltaY = direction === 'up' ? -amount : direction === 'down' ? amount : 0;

        if (options?.selector) {
            const element = await this.resolveSelector(page, options.selector);
            const framework = detectFramework(page);
            if (framework === 'playwright') {
                await element.evaluate((el: any, dy: number) => el.scrollBy(0, dy), deltaY);
            } else {
                await element.evaluate((el: any, dy: number) => el.scrollBy(0, dy), deltaY);
            }
        } else {
            await page.mouse.wheel({ deltaX, deltaY });
        }
    }

    // =================== Queries ===================

    async getText(page: any, selector: string): Promise<string> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.textContent() || '';
        } else {
            return await element.evaluate((el: any) => el.textContent || '');
        }
    }

    async getHtml(page: any, selector: string): Promise<string> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.innerHTML();
        } else {
            return await element.evaluate((el: any) => el.innerHTML);
        }
    }

    async getValue(page: any, selector: string): Promise<string> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.inputValue();
        } else {
            return await element.evaluate((el: any) => el.value || '');
        }
    }

    async getAttr(page: any, selector: string, attribute: string): Promise<string | null> {
        const element = await this.resolveSelector(page, selector);
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            return await element.getAttribute(attribute);
        } else {
            return await element.evaluate((el: any, attr: string) => el.getAttribute(attr), attribute);
        }
    }

    async getUrl(page: any): Promise<string> {
        this.getSessionId(page); // Verify binding
        return typeof page.url === 'function' ? page.url() : '';
    }

    async getTitle(page: any): Promise<string> {
        this.getSessionId(page); // Verify binding
        return await page.title();
    }

    async getCount(page: any, selector: string): Promise<number> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            return await page.locator(selector).count();
        } else {
            const elements = await page.$$(selector);
            return elements.length;
        }
    }

    async getBoundingBox(page: any, selector: string): Promise<{ x: number, y: number, width: number, height: number } | null> {
        const element = await this.resolveSelector(page, selector);
        return await element.boundingBox();
    }

    // =================== State Checks ===================

    async isVisible(page: any, selector: string): Promise<boolean> {
        try {
            const framework = detectFramework(page);
            const element = await this.resolveSelector(page, selector);
            if (framework === 'playwright') {
                return await element.isVisible();
            } else {
                return await element.isVisible();
            }
        } catch {
            return false;
        }
    }

    async isHidden(page: any, selector: string): Promise<boolean> {
        return !(await this.isVisible(page, selector));
    }

    async isEnabled(page: any, selector: string): Promise<boolean> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.isEnabled();
        } else {
            return await element.evaluate((el: any) => !el.disabled);
        }
    }

    async isDisabled(page: any, selector: string): Promise<boolean> {
        return !(await this.isEnabled(page, selector));
    }

    async isChecked(page: any, selector: string): Promise<boolean> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.isChecked();
        } else {
            return await element.evaluate((el: any) => el.checked || false);
        }
    }

    async isFocused(page: any, selector: string): Promise<boolean> {
        const element = await this.resolveSelector(page, selector);
        return await element.evaluate((el: any) => document.activeElement === el);
    }

    async isEditable(page: any, selector: string): Promise<boolean> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.isEditable();
        } else {
            return await element.evaluate((el: any) => !el.disabled && !el.readOnly);
        }
    }

    // =================== Find ===================

    async findByRole(page: any, role: string, options?: { name?: string }): Promise<{ ref: string, name: string }[]> {
        const sessionId = this.getSessionId(page);
        const stored = await this.refStore.load(sessionId);
        if (!stored) return [];
        const results: { ref: string, name: string }[] = [];
        for (const [ref, mapping] of stored.refs) {
            if (mapping.role === role) {
                if (options?.name && !mapping.name.includes(options.name)) continue;
                results.push({ ref, name: mapping.name });
            }
        }
        return results;
    }

    async findByText(page: any, text: string): Promise<{ ref: string, role: string, name: string }[]> {
        const sessionId = this.getSessionId(page);
        const stored = await this.refStore.load(sessionId);
        if (!stored) return [];
        const results: { ref: string, role: string, name: string }[] = [];
        for (const [ref, mapping] of stored.refs) {
            if (mapping.name.includes(text)) {
                results.push({ ref, role: mapping.role, name: mapping.name });
            }
        }
        return results;
    }

    async findByLabel(page: any, text: string): Promise<{ ref: string, role: string, name: string }[]> {
        // Labels map to accessible names, so same as findByText for accessibility tree
        return this.findByText(page, text);
    }

    // =================== Evaluate ===================

    async evaluate(page: any, script: string): Promise<any> {
        this.getSessionId(page); // Verify binding
        return await page.evaluate(script);
    }

    // =================== Private: Selector Resolution ===================

    private async resolveSelector(page: any, selector: string): Promise<any> {
        const framework = detectFramework(page);

        if (selector.startsWith('@e')) {
            const sessionId = this.getSessionId(page);
            const mapping = await this.refStore.get(sessionId, selector);
            if (!mapping) {
                throw new Error(`Unknown ref "${selector}". Run 'page snapshot' first to capture element refs.`);
            }
            return this.resolveRefToElement(page, mapping, selector, framework);
        }

        if (framework === 'playwright') {
            return page.locator(selector);
        } else {
            if (selector.startsWith('//') || selector.startsWith('xpath/')) {
                const xpath = selector.replace(/^xpath\//, '');
                return page.waitForSelector(`::-p-xpath(${xpath})`, { timeout: 5000 });
            }
            return page.waitForSelector(selector, { timeout: 5000 });
        }
    }

    private async resolveRefToElement(page: any, mapping: RefMapping, ref: string, framework: string): Promise<any> {
        // Step 1: Try CSS (faster than xpath)
        if (mapping.css) {
            try {
                if (framework === 'playwright') {
                    const locator = page.locator(mapping.css);
                    if (await locator.count() > 0) return locator.first();
                } else {
                    const el = await page.waitForSelector(mapping.css, { timeout: 2000 });
                    if (el) return el;
                }
            } catch { /* fall through */ }
        }

        // Step 2: Try XPath
        if (mapping.xpath) {
            try {
                if (framework === 'playwright') {
                    const locator = page.locator(`xpath=${mapping.xpath}`);
                    if (await locator.count() > 0) return locator.first();
                } else {
                    const el = await page.waitForSelector(`::-p-xpath(${mapping.xpath})`, { timeout: 2000 });
                    if (el) return el;
                }
            } catch { /* fall through */ }
        }

        // Step 3: Fuzzy match by role + name (Playwright only)
        if (framework === 'playwright' && mapping.role && mapping.name) {
            try {
                const locator = page.getByRole(mapping.role, { name: mapping.name });
                if (await locator.count() > 0) return locator.first();
            } catch { /* fall through */ }
        }

        throw new Error(
            `Element ${ref} (${mapping.role} "${mapping.name}") no longer found on page. ` +
            `Page may have changed. Run 'page snapshot' to refresh refs.`
        );
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest src/testmu-cloud/services/__tests__/page-service.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 5: Run all tests**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/services/page-service.ts src/testmu-cloud/services/__tests__/page-service.test.ts && git commit -m "feat: add PageService with selector resolution, interaction, and queries"
```

---

## Task 7: Wire New Services into Browser Class

**Files:**
- Modify: `src/testmu-cloud/index.ts`
- Modify: `src/index.ts`
- Create: `src/testmu-cloud/stores/index.ts` (barrel export)

- [ ] **Step 1: Create barrel export for stores**

```typescript
// src/testmu-cloud/stores/index.ts
export { SessionStore } from './session-store';
export { InMemorySessionStore } from './memory-session-store';
export { DiskSessionStore } from './disk-session-store';
export { RefStore, RefMapping } from './ref-store';
export { InMemoryRefStore } from './memory-ref-store';
export { DiskRefStore } from './disk-ref-store';
```

- [ ] **Step 2: Add new services to Browser class**

In `src/testmu-cloud/index.ts`, add imports at the top (after existing imports):

```typescript
import { PageService } from './services/page-service';
import { SnapshotService, SnapshotOptions, SnapshotNode, SnapshotResult } from './services/snapshot-service';
import { RefStore } from './stores/ref-store';
import { InMemoryRefStore } from './stores/memory-ref-store';
```

Add new public properties to the Browser class (after line 82, `public events: EventsService;`):

```typescript
    // Page Tools (agent-browser parity)
    public page: PageService;
    public snapshotService: SnapshotService;
```

In the constructor, after `this.events = new EventsService();` (line 104), add:

```typescript
        // Page Tools
        const refStore = new InMemoryRefStore();
        this.snapshotService = new SnapshotService(refStore);
        this.page = new PageService(this.snapshotService, refStore);
```

- [ ] **Step 3: Add new type exports to main index**

In `src/index.ts`, add after existing exports:

```typescript
export { PageService } from './testmu-cloud/services/page-service';
export { SnapshotService, SnapshotOptions, SnapshotNode, SnapshotResult } from './testmu-cloud/services/snapshot-service';
export { SessionStore } from './testmu-cloud/stores/session-store';
export { InMemorySessionStore } from './testmu-cloud/stores/memory-session-store';
export { DiskSessionStore } from './testmu-cloud/stores/disk-session-store';
export { RefStore, RefMapping } from './testmu-cloud/stores/ref-store';
export { InMemoryRefStore } from './testmu-cloud/stores/memory-ref-store';
export { DiskRefStore } from './testmu-cloud/stores/disk-ref-store';
export { detectFramework } from './testmu-cloud/utils/framework-detect';
```

- [ ] **Step 4: Verify build succeeds**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/testmu-cloud/index.ts src/index.ts src/testmu-cloud/stores/index.ts && git commit -m "feat: wire PageService and SnapshotService into Browser class"
```

---

## Task 8: CLI `page` Subcommand

**Files:**
- Create: `src/cli/page-manager.ts`
- Create: `src/cli/commands/page.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Write page-manager (connect-per-command helper)**

```typescript
// src/cli/page-manager.ts
import puppeteer from 'puppeteer-core';
import { DiskSessionStore } from '../testmu-cloud/stores/disk-session-store';
import { DiskRefStore } from '../testmu-cloud/stores/disk-ref-store';
import { PageService } from '../testmu-cloud/services/page-service';
import { SnapshotService } from '../testmu-cloud/services/snapshot-service';
import path from 'path';
import os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.testmuai', 'sessions');

export function getSessionStore(): DiskSessionStore {
    return new DiskSessionStore(SESSIONS_DIR);
}

export function getRefStore(): DiskRefStore {
    return new DiskRefStore(SESSIONS_DIR);
}

export function createPageService(): { pageService: PageService, snapshotService: SnapshotService } {
    const refStore = getRefStore();
    const snapshotService = new SnapshotService(refStore);
    const pageService = new PageService(snapshotService, refStore);
    return { pageService, snapshotService };
}

export async function getSessionPage(sessionId: string): Promise<{
    page: any,
    framework: 'puppeteer' | 'playwright',
    cleanup: () => Promise<void>,
}> {
    const store = getSessionStore();
    const session = await store.get(sessionId);
    if (!session) throw new Error(`Session "${sessionId}" not found. Run 'session create' first.`);
    if (session.status !== 'live') throw new Error(`Session "${sessionId}" is ${session.status}.`);

    const adapter = session.config?.adapter || 'puppeteer';

    if (adapter === 'playwright') {
        // Dynamic import to avoid requiring playwright if not used
        const { chromium } = await import('playwright-core');
        const browser = await chromium.connectOverCDP(session.websocketUrl);
        const contexts = browser.contexts();
        const context = contexts[0] || await browser.newContext();
        const pages = context.pages();
        const page = pages[pages.length - 1] || await context.newPage();
        return {
            page,
            framework: 'playwright',
            cleanup: async () => { await browser.close(); },
        };
    } else {
        const browser = await puppeteer.connect({ browserWSEndpoint: session.websocketUrl });
        const pages = await browser.pages();
        const page = pages[pages.length - 1] || await browser.newPage();
        return {
            page,
            framework: 'puppeteer',
            cleanup: async () => { browser.disconnect(); },
        };
    }
}

export async function resolveSessionId(explicitId?: string): Promise<string> {
    if (explicitId) return explicitId;
    const store = getSessionStore();
    const sessions = await store.list();
    if (sessions.length === 0) throw new Error('No active sessions. Run "session create" first.');
    if (sessions.length > 1) throw new Error(`Multiple active sessions (${sessions.length}). Specify --session <id>.`);
    return sessions[0].id;
}
```

- [ ] **Step 2: Write `page` subcommand**

```typescript
// src/cli/commands/page.ts
import { Output } from '../output';
import { getSessionPage, createPageService, resolveSessionId } from '../page-manager';

export function registerPageCommand(program: any): void {
    const page = program.command('page').description('Page interaction and snapshot tools (selector-based)');

    // =================== Snapshot ===================
    page
        .command('snapshot')
        .description('Capture accessibility tree with @ref element IDs')
        .option('--session <id>', 'Session ID')
        .option('--compact', 'Token-efficient text output')
        .option('--interactive-only', 'Only include interactive elements')
        .option('--max-elements <n>', 'Max refs to assign (default: 500)')
        .option('--diff', 'Show changes since last snapshot')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: browserPage, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(browserPage, sessionId);
                try {
                    const result = await pageService.snapshot(browserPage, {
                        compact: options.compact,
                        interactiveOnly: options.interactiveOnly,
                        maxElements: options.maxElements ? parseInt(options.maxElements) : undefined,
                    });
                    if (options.compact && result.compactText) {
                        process.stdout.write(result.compactText + '\n');
                    } else {
                        Output.success(result);
                    }
                } finally {
                    await cleanup();
                }
            } catch (err) {
                Output.error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });

    // =================== Navigation ===================
    page
        .command('navigate <url>')
        .description('Navigate to URL')
        .option('--session <id>', 'Session ID')
        .action(async (url: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: browserPage, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(browserPage, sessionId);
                try {
                    const result = await pageService.navigate(browserPage, url);
                    Output.success(result);
                } finally {
                    await cleanup();
                }
            } catch (err) {
                Output.error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });

    page.command('back').description('Navigate back').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success(await pageService.back(bp)); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('forward').description('Navigate forward').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success(await pageService.forward(bp)); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('reload').description('Reload page').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success(await pageService.reload(bp)); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Interaction ===================
    page
        .command('click <selector>')
        .description('Click element by @ref or CSS selector')
        .option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { await pageService.click(bp, selector); Output.success({ clicked: selector }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page
        .command('fill <selector> <value>')
        .description('Fill input by @ref or CSS selector')
        .option('--session <id>', 'Session ID')
        .action(async (selector: string, value: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { await pageService.fill(bp, selector, value); Output.success({ filled: selector, value }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page
        .command('select <selector> <values...>')
        .description('Select dropdown option')
        .option('--session <id>', 'Session ID')
        .action(async (selector: string, values: string[], options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { await pageService.select(bp, selector, ...values); Output.success({ selected: selector, values }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('check <selector>').description('Check checkbox').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { await pageService.check(bp, selector); Output.success({ checked: selector }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('uncheck <selector>').description('Uncheck checkbox').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { await pageService.uncheck(bp, selector); Output.success({ unchecked: selector }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('hover <selector>').description('Hover element').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { await pageService.hover(bp, selector); Output.success({ hovered: selector }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Queries ===================
    const get = page.command('get').description('Query element properties');

    get.command('text <selector>').description('Get element text').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ text: await pageService.getText(bp, selector) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('html <selector>').description('Get element HTML').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ html: await pageService.getHtml(bp, selector) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('value <selector>').description('Get input value').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ value: await pageService.getValue(bp, selector) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('attr <selector> <attribute>').description('Get element attribute').option('--session <id>', 'Session ID')
        .action(async (selector: string, attribute: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ attribute, value: await pageService.getAttr(bp, selector, attribute) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('url').description('Get current URL').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ url: await pageService.getUrl(bp) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('title').description('Get page title').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ title: await pageService.getTitle(bp) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== State Checks ===================
    const is = page.command('is').description('Check element state');

    is.command('visible <selector>').description('Check if element is visible').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ visible: await pageService.isVisible(bp, selector) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    is.command('enabled <selector>').description('Check if element is enabled').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ enabled: await pageService.isEnabled(bp, selector) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    is.command('checked <selector>').description('Check if element is checked').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ checked: await pageService.isChecked(bp, selector) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Find ===================
    const find = page.command('find').description('Find elements by role, text, or label');

    find.command('role <role>').description('Find elements by ARIA role').option('--session <id>', 'Session ID').option('--name <name>', 'Filter by name')
        .action(async (role: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success(await pageService.findByRole(bp, role, options.name ? { name: options.name } : undefined)); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    find.command('text <text>').description('Find elements by text content').option('--session <id>', 'Session ID')
        .action(async (text: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success(await pageService.findByText(bp, text)); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    find.command('label <text>').description('Find elements by label').option('--session <id>', 'Session ID')
        .action(async (text: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success(await pageService.findByLabel(bp, text)); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Eval ===================
    page.command('eval <script>').description('Execute JavaScript in page context').option('--session <id>', 'Session ID')
        .action(async (script: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                const { pageService } = createPageService();
                pageService.bind(bp, sessionId);
                try { Output.success({ result: await pageService.evaluate(bp, script) }); } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });
}
```

- [ ] **Step 3: Register `page` command in CLI index**

In `src/cli/index.ts`, add import after existing imports:

```typescript
import { registerPageCommand } from './commands/page';
```

Add registration after `registerEventsCommand(program);` (line 71):

```typescript
// Page Tools (agent-browser parity)
registerPageCommand(program);
```

- [ ] **Step 4: Verify build succeeds**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/cli/page-manager.ts src/cli/commands/page.ts src/cli/index.ts && git commit -m "feat: add CLI 'page' subcommand with snapshot, interaction, queries"
```

---

## Task 9: Session Create — Add `--local` Flag and Disk Persistence

**Files:**
- Modify: `src/cli/commands/session.ts`

- [ ] **Step 1: Add `--local` flag and disk persistence to session create**

In `src/cli/commands/session.ts`, add imports at top:

```typescript
import { DiskSessionStore } from '../../testmu-cloud/stores/disk-session-store';
import path from 'path';
import os from 'os';
```

Add after the `getBrowser()` function:

```typescript
function getSessionStore(): DiskSessionStore {
    return new DiskSessionStore(path.join(os.homedir(), '.testmuai', 'sessions'));
}
```

In `executeSessionCreate`, after `const session = await browser.sessions.create({...});` (line 78), add:

```typescript
    // Persist session to disk for cross-process CLI usage
    const store = getSessionStore();
    await store.save(session);
```

In `registerSessionCommand`, add `--local` option to the `create` command (after `--name` option):

```typescript
    .option('--local', 'Launch local Chrome instead of cloud')
```

In `executeSessionCreate`, add local handling in the session config (inside the `browser.sessions.create()` call):

Add `local: options.local ? true : undefined,` to the config object passed to `browser.sessions.create()`.

- [ ] **Step 2: Update session release to clean disk**

In `executeSessionRelease`, after the release call, add:

```typescript
    const store = getSessionStore();
    await store.delete(id);
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add src/cli/commands/session.ts && git commit -m "feat: add --local flag and disk session persistence for CLI"
```

---

## Task 10: Build, Typecheck, and Full Test Pass

- [ ] **Step 1: Run typecheck**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run full build**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npm run build`
Expected: Compiles to `dist/` successfully

- [ ] **Step 3: Run all unit tests**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && npx jest --verbose`
Expected: All tests pass

- [ ] **Step 4: Verify CLI help shows `page` command**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && node dist/cli/index.js --help`
Expected: Output includes `page` command in the list

- [ ] **Step 5: Verify `page` subcommands**

Run: `cd /Users/sirajk/Documents/plg-exp/browser-cloud && node dist/cli/index.js page --help`
Expected: Shows snapshot, navigate, click, fill, select, check, uncheck, hover, get, is, find, eval

- [ ] **Step 6: Commit if any fixes were needed**

```bash
cd /Users/sirajk/Documents/plg-exp/browser-cloud && git add -A && git commit -m "chore: fix build issues from page tools integration"
```

---

## Summary

| Task | What | Files | Depends On |
|------|------|-------|------------|
| 1 | Framework detection utility | `utils/framework-detect.ts` | — |
| 2 | SessionStore + InMemorySessionStore | `stores/session-store.ts`, `stores/memory-session-store.ts` | — |
| 3 | DiskSessionStore | `stores/disk-session-store.ts` | Task 2 |
| 4 | RefStore + both implementations | `stores/ref-store.ts`, `stores/memory-ref-store.ts`, `stores/disk-ref-store.ts` | — |
| 5 | SnapshotService (@ref system) | `services/snapshot-service.ts` | Task 4 |
| 6 | PageService (interaction + queries) | `services/page-service.ts` | Tasks 1, 4, 5 |
| 7 | Wire into Browser class | `index.ts` modifications | Tasks 5, 6 |
| 8 | CLI `page` subcommand | `cli/commands/page.ts`, `cli/page-manager.ts` | Tasks 6, 7 |
| 9 | Session create --local + disk persistence | `cli/commands/session.ts` | Task 3 |
| 10 | Build + typecheck + full test pass | — | All |

Tasks 1, 2, and 4 can run in parallel (no dependencies). Tasks 3, 5, 6 are sequential. Tasks 7-10 are sequential.
