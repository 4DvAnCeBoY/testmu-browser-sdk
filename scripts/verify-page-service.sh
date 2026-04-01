#!/usr/bin/env bash
# verify-page-service.sh — Page service regression tests (bug #5 verification)
set -uo pipefail

SUITE_NAME="page_service"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true; [[ -n "${SESSION_ID:-}" ]] && $CLI session release "$SESSION_ID" 2>/dev/null || true' EXIT

log "=== Page Service Suite ==="

# Create session
log "Creating session..."
create_out=$(run_cli "ps_create" session create --adapter playwright --stealth) || true
SESSION_ID=$(extract_session_id "$create_out")

if [[ -z "$SESSION_ID" ]]; then
    log_fail "session_create" "No session ID returned"
    exit 1
fi
log_pass "session_create" "id=$SESSION_ID"

# === Navigate & URL/title === (bug #5 — should not hang, 30s timeout)
log "=== Navigate & URL/title ==="
run_cli "ps_navigate" page navigate "https://example.com" --session "$SESSION_ID" || true
nav_out="${ARTIFACT_DIR}/json/ps_navigate.json"
if [[ -s "$nav_out" ]] && jq -e '.data.url or .url' "$nav_out" >/dev/null 2>&1; then
    log_pass "navigate" "Navigated successfully"
else
    log_fail "navigate" "Navigate returned no URL"
fi

# Get URL
run_cli "ps_get_url" page get url --session "$SESSION_ID" || true
url_out="${ARTIFACT_DIR}/json/ps_get_url.json"
if [[ -s "$url_out" ]]; then
    log_pass "get_url" "URL retrieved"
else
    log_fail "get_url" "No URL returned"
fi

# Get title
run_cli "ps_get_title" page get title --session "$SESSION_ID" || true
title_out="${ARTIFACT_DIR}/json/ps_get_title.json"
if [[ -s "$title_out" ]]; then
    log_pass "get_title" "Title retrieved"
else
    log_fail "get_title" "No title returned"
fi

# Snapshot
log "=== Snapshot ==="
run_cli "ps_snapshot" page snapshot --session "$SESSION_ID" || true
snap_out="${ARTIFACT_DIR}/json/ps_snapshot.json"
if [[ -s "$snap_out" ]]; then
    log_pass "snapshot" "Snapshot captured"
else
    log_fail "snapshot" "Empty snapshot"
fi

# Snapshot diff
run_cli "ps_snapshot_diff" page snapshot --diff --session "$SESSION_ID" || true
diff_out="${ARTIFACT_DIR}/json/ps_snapshot_diff.json"
if [[ -s "$diff_out" ]]; then
    log_pass "snapshot_diff" "Diff returned"
else
    log_fail "snapshot_diff" "Empty diff"
fi

# Back / Forward / Reload (should not hang — bug #5)
log "=== Back/Forward/Reload ==="
run_cli "ps_reload" page reload --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/ps_reload.json" ]]; then
    log_pass "reload" "Reload succeeded"
else
    log_fail "reload" "Reload failed"
fi

log "=== Page service tests complete ==="
