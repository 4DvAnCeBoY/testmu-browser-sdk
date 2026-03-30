#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getSessionPage, createPageService, resolveSessionId, getSessionStore } from '../cli/page-manager';
import { NetworkService } from '../testmu-cloud/services/network-service';

const server = new McpServer({
    name: 'browser-cloud',
    version: '1.0.0',
});

const networkService = new NetworkService();

// Helper: run a page command with session lifecycle
async function withPage<T>(sessionId: string | undefined, fn: (ps: any, page: any, sid: string) => Promise<T>, clientId?: string): Promise<T> {
    const sid = await resolveSessionId(sessionId);
    const { page, cleanup } = await getSessionPage(sid);
    const { pageService } = createPageService();
    pageService.bind(page, sid);
    if (clientId) {
        pageService.setClientId(clientId);
    }
    try {
        return await fn(pageService, page, sid);
    } finally {
        await cleanup();
    }
}

// =================== Session Tools ===================

server.tool(
    'session_list',
    'List all active browser sessions',
    { _unused: z.string().optional().describe('Not used') },
    async () => {
        const store = getSessionStore();
        const sessions = await store.list();
        return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
    }
);

// =================== Snapshot Tools ===================

server.tool(
    'browser_snapshot',
    'Capture accessibility tree with @ref element IDs. Returns page structure for AI interaction. Use --diff (browser_snapshot_diff) to see cross-process persistent changes since last snapshot. Use compact mode for token-efficient output. Use clientId to isolate parallel sessions.',
    {
        sessionId: z.string().optional().describe('Session ID (auto-detects if only one active)'),
        compact: z.boolean().optional().describe('Token-efficient text output; omits verbose structural data'),
        maxElements: z.number().optional().describe('Max refs to assign (default: 500)'),
        clientId: z.string().optional().describe('Client ID for parallel isolation; scopes @ref state to this client'),
    },
    async ({ sessionId, compact, maxElements, clientId }) => {
        const result = await withPage(sessionId, async (ps, page) => {
            return ps.snapshot(page, { compact: compact || false, maxElements });
        }, clientId);
        if (compact && result.compactText) {
            return { content: [{ type: 'text', text: result.compactText }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'browser_snapshot_diff',
    'Show changes since last snapshot (cross-process persistent via disk). Useful after performing actions to see what changed without re-scanning the full tree.',
    {
        sessionId: z.string().optional().describe('Session ID'),
        compact: z.boolean().optional().describe('Token-efficient text output'),
        clientId: z.string().optional().describe('Client ID for parallel isolation; must match the clientId used in browser_snapshot'),
    },
    async ({ sessionId, compact, clientId }) => {
        const result = await withPage(sessionId, async (ps, page) => {
            return ps.snapshotDiff(page, { compact: compact || false });
        }, clientId);
        if (compact && result.compactText) {
            return { content: [{ type: 'text', text: result.compactText }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.diff, null, 2) }] };
    }
);

// =================== Navigation Tools ===================

server.tool(
    'browser_navigate',
    'Navigate to a URL',
    {
        url: z.string().describe('URL to navigate to'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ url, sessionId }) => {
        const result = await withPage(sessionId, async (ps, page) => ps.navigate(page, url));
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'browser_go_back',
    'Navigate back in browser history',
    { sessionId: z.string().optional().describe('Session ID') },
    async ({ sessionId }) => {
        const result = await withPage(sessionId, async (ps, page) => ps.back(page));
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'browser_go_forward',
    'Navigate forward in browser history',
    { sessionId: z.string().optional().describe('Session ID') },
    async ({ sessionId }) => {
        const result = await withPage(sessionId, async (ps, page) => ps.forward(page));
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'browser_reload',
    'Reload the current page',
    { sessionId: z.string().optional().describe('Session ID') },
    async ({ sessionId }) => {
        const result = await withPage(sessionId, async (ps, page) => ps.reload(page));
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

// =================== Interaction Tools ===================

server.tool(
    'browser_click',
    'Click an element. Accepts @ref IDs from snapshot (e.g. @e5) or standard CSS selectors.',
    {
        selector: z.string().describe('@ref ID from snapshot (e.g. @e5) or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ selector, sessionId, clientId }) => {
        await withPage(sessionId, async (ps, page) => ps.click(page, selector), clientId);
        return { content: [{ type: 'text', text: JSON.stringify({ clicked: selector }) }] };
    }
);

server.tool(
    'browser_fill',
    'Fill an input field. Accepts @ref IDs from snapshot (e.g. @e5) or standard CSS selectors. Clears the field first then sets value.',
    {
        selector: z.string().describe('@ref ID from snapshot (e.g. @e5) or CSS selector'),
        value: z.string().describe('Text to fill'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ selector, value, sessionId, clientId }) => {
        await withPage(sessionId, async (ps, page) => ps.fill(page, selector, value), clientId);
        return { content: [{ type: 'text', text: JSON.stringify({ filled: selector, value }) }] };
    }
);

server.tool(
    'browser_type',
    'Type text with key events into an element. Accepts @ref IDs from snapshot (e.g. @e5) or CSS selectors. Unlike fill, dispatches real key events character by character.',
    {
        selector: z.string().describe('@ref ID from snapshot (e.g. @e5) or CSS selector'),
        text: z.string().describe('Text to type'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ selector, text, sessionId, clientId }) => {
        await withPage(sessionId, async (ps, page) => ps.type(page, selector, text), clientId);
        return { content: [{ type: 'text', text: JSON.stringify({ typed: selector, text }) }] };
    }
);

server.tool(
    'browser_select',
    'Select a dropdown option. Accepts @ref IDs from snapshot (e.g. @e5) or CSS selectors. Supports multi-select by passing multiple values.',
    {
        selector: z.string().describe('@ref ID from snapshot (e.g. @e5) or CSS selector'),
        values: z.array(z.string()).describe('Values to select'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ selector, values, sessionId, clientId }) => {
        await withPage(sessionId, async (ps, page) => ps.select(page, selector, ...values), clientId);
        return { content: [{ type: 'text', text: JSON.stringify({ selected: selector, values }) }] };
    }
);

server.tool(
    'browser_check',
    'Check a checkbox',
    {
        selector: z.string().describe('Element @ref or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ selector, sessionId }) => {
        await withPage(sessionId, async (ps, page) => ps.check(page, selector));
        return { content: [{ type: 'text', text: JSON.stringify({ checked: selector }) }] };
    }
);

server.tool(
    'browser_hover',
    'Hover over an element',
    {
        selector: z.string().describe('Element @ref or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ selector, sessionId }) => {
        await withPage(sessionId, async (ps, page) => ps.hover(page, selector));
        return { content: [{ type: 'text', text: JSON.stringify({ hovered: selector }) }] };
    }
);

server.tool(
    'browser_press_key',
    'Press a keyboard key (e.g. Enter, Tab, Escape)',
    {
        key: z.string().describe('Key name (e.g. Enter, Tab, Escape, ArrowDown)'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ key, sessionId }) => {
        await withPage(sessionId, async (ps, page) => ps.press(page, key));
        return { content: [{ type: 'text', text: JSON.stringify({ pressed: key }) }] };
    }
);

server.tool(
    'browser_scroll',
    'Scroll the page or a specific element. Horizontal scrolling (left/right) works when a selector is provided — element-scoped scrolls support all four directions.',
    {
        direction: z.enum(['up', 'down', 'left', 'right']).optional().describe('Scroll direction (default: down). Horizontal scrolling requires a selector.'),
        amount: z.number().optional().describe('Scroll amount in pixels (default: 300)'),
        selector: z.string().optional().describe('@ref ID or CSS selector of element to scroll (default: page). Required for horizontal scrolling.'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ direction, amount, selector, sessionId, clientId }) => {
        await withPage(sessionId, async (ps, page) => ps.scroll(page, { direction, amount, selector }), clientId);
        return { content: [{ type: 'text', text: JSON.stringify({ scrolled: direction || 'down', amount: amount || 300 }) }] };
    }
);

// =================== Query Tools ===================

server.tool(
    'browser_get_text',
    'Get text content of an element',
    {
        selector: z.string().describe('Element @ref or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ selector, sessionId }) => {
        const text = await withPage(sessionId, async (ps, page) => ps.getText(page, selector));
        return { content: [{ type: 'text', text: JSON.stringify({ text }) }] };
    }
);

server.tool(
    'browser_get_value',
    'Get value of an input element',
    {
        selector: z.string().describe('Element @ref or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ selector, sessionId }) => {
        const value = await withPage(sessionId, async (ps, page) => ps.getValue(page, selector));
        return { content: [{ type: 'text', text: JSON.stringify({ value }) }] };
    }
);

server.tool(
    'browser_get_url',
    'Get current page URL',
    { sessionId: z.string().optional().describe('Session ID') },
    async ({ sessionId }) => {
        const url = await withPage(sessionId, async (ps, page) => ps.getUrl(page));
        return { content: [{ type: 'text', text: JSON.stringify({ url }) }] };
    }
);

server.tool(
    'browser_get_title',
    'Get current page title',
    { sessionId: z.string().optional().describe('Session ID') },
    async ({ sessionId }) => {
        const title = await withPage(sessionId, async (ps, page) => ps.getTitle(page));
        return { content: [{ type: 'text', text: JSON.stringify({ title }) }] };
    }
);

// =================== State Check Tools ===================

server.tool(
    'browser_is_visible',
    'Check if an element is visible',
    {
        selector: z.string().describe('Element @ref or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ selector, sessionId }) => {
        const visible = await withPage(sessionId, async (ps, page) => ps.isVisible(page, selector));
        return { content: [{ type: 'text', text: JSON.stringify({ visible }) }] };
    }
);

server.tool(
    'browser_is_enabled',
    'Check if an element is enabled',
    {
        selector: z.string().describe('Element @ref or CSS selector'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ selector, sessionId }) => {
        const enabled = await withPage(sessionId, async (ps, page) => ps.isEnabled(page, selector));
        return { content: [{ type: 'text', text: JSON.stringify({ enabled }) }] };
    }
);

// =================== Find Tools ===================

server.tool(
    'browser_find_by_role',
    'Find elements by ARIA role in the last snapshot. Returns @ref IDs usable with click/fill/type/select. Call browser_snapshot first.',
    {
        role: z.string().describe('ARIA role (e.g. button, link, textbox, checkbox, combobox)'),
        name: z.string().optional().describe('Filter by accessible name (partial match)'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ role, name, sessionId, clientId }) => {
        const results = await withPage(sessionId, async (ps, page) => ps.findByRole(page, role, name ? { name } : undefined), clientId);
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
);

server.tool(
    'browser_find_by_text',
    'Find elements by text content in the last snapshot. Returns @ref IDs usable with click/fill/type/select. Call browser_snapshot first.',
    {
        text: z.string().describe('Text to search for (partial match)'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ text, sessionId, clientId }) => {
        const results = await withPage(sessionId, async (ps, page) => ps.findByText(page, text), clientId);
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
);

// =================== Wait Tool ===================

server.tool(
    'browser_wait',
    'Wait for an element to appear, or wait a fixed number of milliseconds. Use @ref IDs from snapshot or CSS selectors for element waits.',
    {
        selector: z.string().optional().describe('@ref ID (e.g. @e5) or CSS selector to wait for. Mutually exclusive with ms.'),
        ms: z.number().optional().describe('Milliseconds to wait (e.g. 500). Mutually exclusive with selector.'),
        timeout: z.number().optional().describe('Max wait time in ms for element selector (default: 30000)'),
        sessionId: z.string().optional().describe('Session ID'),
        clientId: z.string().optional().describe('Client ID for parallel isolation'),
    },
    async ({ selector, ms, timeout, sessionId, clientId }) => {
        if (ms !== undefined) {
            await new Promise(resolve => setTimeout(resolve, ms));
            return { content: [{ type: 'text', text: JSON.stringify({ waited: ms }) }] };
        }
        if (!selector) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Provide selector or ms' }) }] };
        }
        await withPage(sessionId, async (ps, page) => {
            await page.waitForSelector(selector, { timeout: timeout || 30000 });
        }, clientId);
        return { content: [{ type: 'text', text: JSON.stringify({ found: selector }) }] };
    }
);

// =================== Evaluate Tool ===================

server.tool(
    'browser_evaluate',
    'Execute JavaScript in the page context. BLOCKED by default — requires allowUnsafe: true in server config. Security rationale: arbitrary JS execution can exfiltrate data, bypass auth, or corrupt page state. Only enable in trusted, sandboxed environments.',
    {
        script: z.string().describe('JavaScript code to execute'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ script, sessionId }) => {
        const result = await withPage(sessionId, async (ps, page) => ps.evaluate(page, script));
        return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
    }
);

// =================== Network Tools ===================

server.tool(
    'browser_network_block',
    'Block network requests matching a URL pattern',
    {
        pattern: z.string().describe('URL pattern to block (e.g. *.ads.com/*)'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ pattern, sessionId }) => {
        const sid = await resolveSessionId(sessionId);
        const { page, cleanup } = await getSessionPage(sid);
        try {
            await networkService.block(page, sid, pattern);
            return { content: [{ type: 'text', text: JSON.stringify({ blocked: pattern }) }] };
        } finally {
            await cleanup();
        }
    }
);

server.tool(
    'browser_network_mock',
    'Mock a URL with a custom response',
    {
        url: z.string().describe('URL to mock'),
        body: z.string().describe('Response body'),
        status: z.number().optional().describe('HTTP status code (default: 200)'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ url, body, status, sessionId }) => {
        const sid = await resolveSessionId(sessionId);
        const { page, cleanup } = await getSessionPage(sid);
        try {
            await networkService.mock(page, sid, url, { status: status || 200, body });
            return { content: [{ type: 'text', text: JSON.stringify({ mocked: url }) }] };
        } finally {
            await cleanup();
        }
    }
);

server.tool(
    'browser_network_headers',
    'Set extra HTTP headers for all requests',
    {
        headers: z.record(z.string(), z.string()).describe('Headers as key-value pairs'),
        sessionId: z.string().optional().describe('Session ID'),
    },
    async ({ headers, sessionId }) => {
        const sid = await resolveSessionId(sessionId);
        const { page, cleanup } = await getSessionPage(sid);
        try {
            await networkService.setHeaders(page, headers);
            return { content: [{ type: 'text', text: JSON.stringify({ headers: Object.keys(headers) }) }] };
        } finally {
            await cleanup();
        }
    }
);

// =================== Start Server ===================

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error('MCP server error:', err);
    process.exit(1);
});
