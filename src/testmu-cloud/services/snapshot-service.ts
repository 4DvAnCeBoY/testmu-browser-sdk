import { RefStore, RefMapping } from '../stores/ref-store';

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
                refMap.set(ref, {
                    xpath: '',
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
        };

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
