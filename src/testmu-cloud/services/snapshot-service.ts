import { RefStore, RefMapping } from '../stores/ref-store';
import { detectFramework } from '../utils/framework-detect';

export interface SnapshotOptions {
    maxDepth?: number;
    maxElements?: number;
    compact?: boolean;
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

export interface SnapshotDiff {
    urlChanged: boolean;
    previousUrl?: string;
    currentUrl: string;
    added: { ref?: string, role: string, name: string }[];
    removed: { ref?: string, role: string, name: string }[];
    changed: {
        ref?: string;
        role: string;
        name: string;
        changes: { field: string, from: string, to: string }[];
    }[];
    unchanged: number;
}

const REF_ELIGIBLE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'listbox',
    'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'searchbox',
    'slider', 'spinbutton', 'switch', 'tab', 'treeitem',
    'heading', 'img', 'navigation', 'main', 'banner', 'contentinfo',
    'complementary', 'form', 'search', 'dialog', 'alertdialog', 'alert',
]);

function shouldAssignRef(role: string): boolean {
    return REF_ELIGIBLE_ROLES.has(role.toLowerCase());
}

export class SnapshotService {
    private previousSnapshots = new Map<string, SnapshotResult>();
    private clientId?: string;

    constructor(private refStore: RefStore) {}

    /** Set client ID for parallel session isolation */
    setClientId(clientId: string): void {
        this.clientId = clientId;
    }

    async capture(page: any, sessionId: string, options: SnapshotOptions = {}): Promise<SnapshotResult> {
        const maxElements = options.maxElements || 500;
        const url = typeof page.url === 'function' ? page.url() : '';
        const title = await page.title();
        const timestamp = Date.now();

        // Phase A: Get accessibility tree from browser engine
        let rawTree: any;
        try {
            const framework = detectFramework(page);
            if (framework === 'playwright') {
                // Try passing interestingOnly for consistency with Puppeteer path;
                // some Playwright versions may not support the option, so fall back.
                try {
                    rawTree = await page.accessibility.snapshot({ interestingOnly: false } as any);
                } catch {
                    rawTree = await page.accessibility.snapshot();
                }
            } else {
                // Puppeteer supports interestingOnly option
                rawTree = await page.accessibility.snapshot({ interestingOnly: false });
            }
        } catch {
            rawTree = { role: 'WebArea', name: title, children: [] };
        }

        if (!rawTree) {
            rawTree = { role: 'WebArea', name: title, children: [] };
        }

        // Phase B: Assign refs and build snapshot tree
        let refCounter = 0;
        let totalElements = 0;
        let truncated = false;
        const refMap = new Map<string, RefMapping>();

        const processNode = (node: any, depth: number): SnapshotNode | null => {
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

                // Generate best CSS selector from available a11y info
                const role = result.role;
                const name = result.name;
                const css = name
                    ? `[role="${role}"][aria-label="${name.replace(/"/g, '\\"')}"]`
                    : `[role="${role}"]`;

                refMap.set(ref, {
                    xpath: '',
                    css,
                    role,
                    name,
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
        };

        const tree = processNode(rawTree, 0) || { role: 'WebArea', name: title };

        // Store refs (with clientId for parallel isolation)
        await this.refStore.save(sessionId, refMap, url, this.clientId);

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

        // Store for diffing
        this.previousSnapshots.set(sessionId, snapshotResult);

        return snapshotResult;
    }

    /** Clear cached snapshot data for a session to prevent memory leaks */
    clearSession(sessionId: string): void {
        this.previousSnapshots.delete(sessionId);
    }

    getPrevious(sessionId: string): SnapshotResult | null {
        return this.previousSnapshots.get(sessionId) || null;
    }

    setPrevious(sessionId: string, snapshot: SnapshotResult): void {
        this.previousSnapshots.set(sessionId, snapshot);
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

    diff(previous: SnapshotResult, current: SnapshotResult): SnapshotDiff {
        const prevRefs = this.collectRefs(previous.tree);
        const currRefs = this.collectRefs(current.tree);

        const added: SnapshotDiff['added'] = [];
        const removed: SnapshotDiff['removed'] = [];
        const changed: SnapshotDiff['changed'] = [];
        let unchanged = 0;

        // Find added and changed
        for (const [key, curr] of currRefs) {
            const prev = prevRefs.get(key);
            if (!prev) {
                added.push({ ref: curr.ref, role: curr.role, name: curr.name });
            } else {
                const changes: { field: string, from: string, to: string }[] = [];
                if (prev.value !== curr.value) changes.push({ field: 'value', from: prev.value || '', to: curr.value || '' });
                if (prev.state?.disabled !== curr.state?.disabled) changes.push({ field: 'disabled', from: String(!!prev.state?.disabled), to: String(!!curr.state?.disabled) });
                if (prev.state?.checked !== curr.state?.checked) changes.push({ field: 'checked', from: String(!!prev.state?.checked), to: String(!!curr.state?.checked) });
                if (changes.length > 0) {
                    changed.push({ ref: curr.ref, role: curr.role, name: curr.name, changes });
                } else {
                    unchanged++;
                }
            }
        }

        // Find removed
        for (const [key, prev] of prevRefs) {
            if (!currRefs.has(key)) {
                removed.push({ ref: prev.ref, role: prev.role, name: prev.name });
            }
        }

        return {
            urlChanged: previous.url !== current.url,
            previousUrl: previous.url !== current.url ? previous.url : undefined,
            currentUrl: current.url,
            added,
            removed,
            changed,
            unchanged,
        };
    }

    diffToCompactText(diff: SnapshotDiff, title: string): string {
        const lines: string[] = [];
        lines.push(`[${title}] ${diff.currentUrl}`);
        if (diff.urlChanged) lines.push(`CHANGED: URL ${diff.previousUrl} → ${diff.currentUrl}`);
        if (diff.removed.length > 0) lines.push(`REMOVED: ${diff.removed.map(r => `${r.ref || ''} ${r.role} "${r.name}"`).join(', ')}`);
        if (diff.added.length > 0) lines.push(`ADDED: ${diff.added.map(a => `${a.ref || ''} ${a.role} "${a.name}"`).join(', ')}`);
        if (diff.changed.length > 0) {
            for (const c of diff.changed) {
                const desc = c.changes.map(ch => `${ch.field}: ${ch.from} → ${ch.to}`).join(', ');
                lines.push(`CHANGED: ${c.ref || ''} ${c.role} "${c.name}" (${desc})`);
            }
        }
        if (diff.removed.length === 0 && diff.added.length === 0 && diff.changed.length === 0) {
            lines.push(`No changes (${diff.unchanged} elements unchanged)`);
        }
        return lines.join('\n');
    }

    private collectRefs(node: SnapshotNode, map = new Map<string, SnapshotNode>(), counters = new Map<string, number>()): Map<string, SnapshotNode> {
        // Key by role+name+occurrence index to handle duplicate names (e.g. multiple "Submit" buttons)
        const baseKey = `${node.role}:${node.name}`;
        const count = counters.get(baseKey) || 0;
        counters.set(baseKey, count + 1);
        const key = `${baseKey}:${count}`;
        // Index nodes with @ref OR non-empty name (excluding root WebArea) so diffs work even with refCount=0
        const isRoot = node.role.toLowerCase() === 'webarea';
        if (node.ref || (node.name && !isRoot)) {
            map.set(key, node);
        }
        if (node.children) {
            for (const child of node.children) this.collectRefs(child, map, counters);
        }
        return map;
    }
}
