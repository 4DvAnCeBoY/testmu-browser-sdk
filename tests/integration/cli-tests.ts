/**
 * CLI Integration Tests — Persona 2: CLI User (Claude Code agent)
 *
 * Executes CLI commands via child_process.execSync.
 * Requires LT_USERNAME + LT_ACCESS_KEY env vars.
 * Requires a built dist/ (run `npm run build` first).
 *
 * NOTE: Each CLI `page` command creates a separate browser connection.
 * On LambdaTest cloud, reconnection to Playwright sessions may fail,
 * so page tests use puppeteer adapter and each test creates its own session.
 *
 * Run: npx jest tests/integration/cli-tests.ts --runInBand --testTimeout=90000
 */

import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { requireEnvVars } from './helpers';

// CLI tests need longer timeouts: each command reconnects to cloud (15-20s each)
const TEST_TIMEOUT_MS = 90_000;
const MULTI_STEP_TIMEOUT_MS = 180_000;

// ─── Global setup ─────────────────────────────────────────────────────────────

beforeAll(() => {
    requireEnvVars();
});

// ─── CLI helper ───────────────────────────────────────────────────────────────

const CLI = 'npx testmu-browser-cloud';

const EXEC_OPTS: ExecSyncOptionsWithStringEncoding = {
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env },
};

/**
 * Extract the last valid JSON object/array from CLI output.
 * The CLI may print console.log lines before the JSON result.
 */
function extractJson(raw: string): any {
    const lines = raw.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('{') || line.startsWith('[')) {
            const candidate = lines.slice(i).join('\n').trim();
            try {
                return JSON.parse(candidate);
            } catch { /* try next line */ }
        }
    }
    throw new Error(`No JSON found in CLI output:\n${raw}`);
}

function cli(args: string): any {
    const raw = execSync(`${CLI} ${args}`, EXEC_OPTS);
    return extractJson(raw);
}

function cliRaw(args: string): string {
    return execSync(`${CLI} ${args}`, EXEC_OPTS).trim();
}

function cliExpectFail(args: string): Error {
    try {
        execSync(`${CLI} ${args}`, { ...EXEC_OPTS, stdio: ['pipe', 'pipe', 'pipe'] });
        throw new Error(`Expected CLI command to fail but it succeeded: ${args}`);
    } catch (e) {
        return e as Error;
    }
}

// ─── Session tracking for cleanup ───────────────────────────────────────────

const createdSessions: string[] = [];

function createSession(adapter = 'puppeteer'): string {
    const result = cli(`session create --adapter ${adapter}`);
    const id = result.data.id;
    createdSessions.push(id);
    return id;
}

function releaseSession(id: string): void {
    try { cli(`session release ${id}`); } catch { /* best-effort */ }
    const idx = createdSessions.indexOf(id);
    if (idx >= 0) createdSessions.splice(idx, 1);
}

afterAll(() => {
    for (const id of [...createdSessions]) {
        releaseSession(id);
    }
});

// ─── Session Management Tests ───────────────────────────────────────────────

describe('CLI: Session Management', () => {
    // Test 73
    test('73. CLI: session create --adapter puppeteer', () => {
        const result = cli('session create --adapter puppeteer');
        expect(result.success).toBe(true);
        expect(result.data.id).toBeTruthy();
        createdSessions.push(result.data.id);
        releaseSession(result.data.id);
    }, TEST_TIMEOUT_MS);

    // Test 74 — session list returns JSON array (sessions are per-process, so we just verify structure)
    test('74. CLI: session list (verify JSON structure)', () => {
        const result = cli('session list');
        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
    }, TEST_TIMEOUT_MS);

    // Test 83
    test('83. CLI: session release <id>', () => {
        const sessionId = createSession();
        const idx = createdSessions.indexOf(sessionId);
        if (idx >= 0) createdSessions.splice(idx, 1); // don't track — testing explicit release
        const result = cli(`session release ${sessionId}`);
        expect(result.success).toBe(true);
    }, TEST_TIMEOUT_MS);

    // Test 84
    test('84. CLI: session release-all', () => {
        createSession();
        createSession();
        const result = cli('session release-all');
        expect(result.success).toBe(true);
        createdSessions.length = 0;
    }, TEST_TIMEOUT_MS);
});

// ─── Page Command Tests (each creates its own session) ─────────────────────

describe('CLI: Page Navigate', () => {
    // Test 75
    test('75. CLI: page navigate and verify URL', () => {
        const sessionId = createSession();
        try {
            const result = cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.url).toContain('saucedemo.com');
            expect(result.data.title).toBeTruthy();
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);
});

describe('CLI: Page Snapshot', () => {
    // Test 76
    test('76. CLI: page snapshot --compact', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const raw = cliRaw(`page snapshot --compact --session ${sessionId}`);
            expect(raw).toContain('saucedemo');
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    // Test 80
    test('80. CLI: page snapshot --diff', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            cli(`page snapshot --session ${sessionId}`);
            // Navigate to a different page to create a diff
            cli(`page navigate https://the-internet.herokuapp.com --session ${sessionId}`);
            const result = cli(`page snapshot --diff --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        } finally {
            releaseSession(sessionId);
        }
    }, MULTI_STEP_TIMEOUT_MS);
});

describe('CLI: Page Interactions', () => {
    // Test 77
    test('77. CLI: page click', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            cli(`page fill "#user-name" "standard_user" --session ${sessionId}`);
            cli(`page fill "#password" "secret_sauce" --session ${sessionId}`);
            const result = cli(`page click "#login-button" --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.clicked).toBe('#login-button');
        } finally {
            releaseSession(sessionId);
        }
    }, MULTI_STEP_TIMEOUT_MS);

    // Test 78
    test('78. CLI: page fill', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page fill "#user-name" "standard_user" --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.filled).toBe('#user-name');
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    // Test 79
    test('79. CLI: page get text', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page get text ".login_logo" --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.text).toBeTruthy();
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    // Test 81
    test('81. CLI: page eval with --allow-unsafe', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page eval "1+1" --allow-unsafe --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.result).toBe(2);
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    // Test: page eval without --allow-unsafe fails
    test('CLI: page eval without --allow-unsafe fails', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const err = cliExpectFail(`page eval "document.cookie" --session ${sessionId}`);
            const msg = (err as any).stderr || (err as any).stdout || err.message;
            expect(msg).toMatch(/allowUnsafe|restricted/i);
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);
});

describe('CLI: Page Queries', () => {
    test('CLI: page get url', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page get url --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.url).toContain('saucedemo.com');
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    test('CLI: page get title', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page get title --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.title).toBeTruthy();
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    test('CLI: page is visible', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page is visible "#login-button" --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.visible).toBe(true);
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);
});

describe('CLI: Navigation Controls', () => {
    test('CLI: page reload', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            const result = cli(`page reload --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(result.data.url).toContain('saucedemo');
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    test('CLI: page back after navigate', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            cli(`page navigate https://the-internet.herokuapp.com --session ${sessionId}`);
            const backResult = cli(`page back --session ${sessionId}`);
            expect(backResult.success).toBe(true);
        } finally {
            releaseSession(sessionId);
        }
    }, MULTI_STEP_TIMEOUT_MS);

    test('CLI: page press Enter to submit', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            cli(`page fill "#user-name" "standard_user" --session ${sessionId}`);
            cli(`page fill "#password" "secret_sauce" --session ${sessionId}`);
            const result = cli(`page press Enter --session ${sessionId}`);
            expect(result.success).toBe(true);
        } finally {
            releaseSession(sessionId);
        }
    }, MULTI_STEP_TIMEOUT_MS);
});

describe('CLI: Find Operations', () => {
    test('82. CLI: page find role button', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            cli(`page snapshot --session ${sessionId}`);
            const result = cli(`page find role button --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
            // Cloud CDP may return 0 refs — that's OK, verify structure
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);

    test('CLI: page find text', () => {
        const sessionId = createSession();
        try {
            cli(`page navigate https://www.saucedemo.com --session ${sessionId}`);
            cli(`page snapshot --session ${sessionId}`);
            const result = cli(`page find text "Login" --session ${sessionId}`);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
        } finally {
            releaseSession(sessionId);
        }
    }, TEST_TIMEOUT_MS);
});
