# Bug Report — browser-cloud Plugin Fixes

**Date**: 2026-04-04 (fixes applied)
**Plugin**: @testmuai/browser-cloud v1.0.2
**Previous Report**: 2026-04-03 (7 browser-cloud bugs + deep audit)

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Reported browser-cloud bugs | 7 | 5 fixed, 2 already fixed |
| Proactive fixes (deep audit) | 14 | All fixed |
| **Total fixes** | **21** | **All resolved** |

---

## Reported Browser-Cloud Plugin Bugs

### BUG-012: browser-cloud TypeScript build fails — ALREADY FIXED
**Severity**: Medium
**Status**: Build passes cleanly (`npm run build` — 0 errors)

### BUG-013: Cloud session page commands fail with WebSocket disconnect — FIXED
**Severity**: Critical
**Root Cause**: `DiskSessionStore.save()` strips credentials from WebSocket URLs for security. The Playwright reconnection path in `page-manager.ts` had credential reconstruction logic, but the Puppeteer path did not — causing all Puppeteer cloud sessions to fail on reconnect.
**Fix**: Added credential reconstruction from `ConfigManager` to the Puppeteer path, matching the existing Playwright implementation (`page-manager.ts`).

### BUG-014: Cloud session interactive commands return null page — FIXED
**Severity**: Critical
**Root Cause**: `getSessionPage()` could return a null page when the browser had no open tabs (e.g., after a crash or disconnect). The `computer.ts` command handler checked for null but gave an unhelpful error.
**Fix**: Added explicit array length check before accessing `pages[length-1]`, guaranteed `browser.newPage()` fallback, and improved error message in `computer.ts`.

### BUG-015: Session release returns contradictory success/failure — ALREADY FIXED
**Severity**: Low
**Status**: Already handled by cross-process release normalization in `session.ts` (lines 129-134).

### BUG-016: Local session creation fails — FIXED
**Severity**: High
**Root Cause**: Chrome launch had poor error handling — no PID guard, unhelpful timeout messages, limited Chrome path discovery.
**Fix**: Added expanded Chrome path candidates (WSL support), spawn error wrapping, PID existence check, stderr capture in timeout/exit errors, and actionable installation instructions (`local-browser-service.ts`).

### BUG-019: `run` command cannot resolve automation modules — FIXED
**Severity**: High
**Root Cause**: Preload script computed `node_modules` path as `path.resolve(__dirname, '../../node_modules')` — but at runtime `__dirname` is `dist/cli/commands/`, so `../../node_modules` resolves to `dist/node_modules` (doesn't exist). Correct path is 3 levels up.
**Fix**: Changed to `'../../../node_modules'` and added `NODE_PATH` env var in the child process environment (`run.ts`).

### BUG-020: Preload script strips browserWSEndpoint from connect call — FIXED
**Severity**: High
**Root Cause**: Puppeteer preload unconditionally overwrote `options.browserWSEndpoint` in the patched `connect()`. Playwright preload unconditionally replaced the endpoint argument. Scripts using our SDK or custom endpoints were broken.
**Fix**: Both preloads now only set the endpoint if the user didn't provide one (`run.ts`).

---

## Proactive Fixes (Deep Audit)

### Puppeteer/Playwright Asymmetry Fixes (5)

| Issue | Fix | File |
|-------|-----|------|
| Playwright path missing DOM readiness wait after navigation | Added `waitForSelector('body', { timeout: 10000 })` | `page-manager.ts` |
| Playwright used exact URL match vs Puppeteer's `startsWith` | Normalized both to `startsWith` with trailing slash normalization | `page-manager.ts` |
| Playwright timeout 15s vs Puppeteer 30s for navigation | Normalized both to 30s | `page-manager.ts` |
| Full-page screenshot CDP fallback only in Playwright | Unified CDP `Page.getLayoutMetrics` + clip capture for both frameworks | `computer-service.ts` |
| Accessibility snapshot `interestingOnly` inconsistency | Added `interestingOnly: false` for Playwright (with try/catch fallback) | `snapshot-service.ts` |

### Null Safety / Error Handling Fixes (8)

| Issue | Fix | File |
|-------|-----|------|
| `pages[length-1]` without length check (Playwright path) | Added `pages.length > 0` guard | `page-manager.ts` |
| Unsafe `dataUrl.split(',')[1]` in file download | Added validation with descriptive error | `file-service.ts` |
| Non-null assertion `Map.get()!` in quick actions | Replaced with explicit null check + error | `quick-actions.ts` |
| `json.data[0]` without `Array.isArray` check | Added type guard | `lambdatest-api.ts` |
| `metrics.cssContentSize` assumed non-null in CDP screenshot | Added null + dimension guards | `computer-service.ts` |
| Chrome `spawn()` unguarded | Added try/catch + PID existence check | `local-browser-service.ts` |
| Chrome timeout error gives no diagnostic info | Added stderr capture in error messages | `local-browser-service.ts` |
| Chrome exit error gives no context | Added Chrome path + stderr in error | `local-browser-service.ts` |

### Security (1 verified, no fix needed)

| Issue | Status |
|-------|--------|
| Session CLI output could expose WebSocket credentials | Already handled by `Output.redact()` — strips `wss://user:pass@` patterns, `accessKey`, `password` fields |

---

## Files Changed

| File | Lines Changed | Bugs Fixed |
|------|--------------|------------|
| `src/cli/page-manager.ts` | +34 -13 | BUG-013, BUG-014, 4 asymmetry fixes |
| `src/cli/commands/run.ts` | +20 -3 | BUG-019, BUG-020 |
| `src/cli/commands/computer.ts` | +1 -1 | BUG-014 |
| `src/testmu-cloud/services/local-browser-service.ts` | +45 -13 | BUG-016, 3 error handling fixes |
| `src/testmu-cloud/services/computer-service.ts` | +33 -27 | CDP screenshot asymmetry, metrics guard |
| `src/testmu-cloud/services/snapshot-service.ts` | +10 -4 | Accessibility tree asymmetry |
| `src/testmu-cloud/services/file-service.ts` | +4 -2 | Null safety |
| `src/testmu-cloud/services/quick-actions.ts` | +3 -2 | Null safety |
| `src/testmu-cloud/utils/lambdatest-api.ts` | +2 -2 | Null safety |

## Verification

- TypeScript build: **0 errors**
- Tests: **91/91 passing**
- ESLint: **0 errors**
