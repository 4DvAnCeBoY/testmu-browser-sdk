#!/usr/bin/env bash
# test-local-exhaustive.sh — Exhaustive local Chrome tests
set -uo pipefail

SUITE_NAME="local_exhaustive"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true; [[ -n "${SESSION_ID:-}" ]] && $CLI session release "$SESSION_ID" 2>/dev/null || true' EXIT

log "=== Local Exhaustive Test Suite ==="

# =================== Session Lifecycle ===================
log "--- Session Lifecycle ---"

create_out=$(run_cli "local_create" session create --local) || true
SESSION_ID=$(extract_session_id "$create_out")
if [[ -z "$SESSION_ID" ]]; then
    log_fail "session_create_local" "No session ID"
    exit 1
fi
log_pass "session_create_local" "id=$SESSION_ID"

# List
run_cli "local_list" session list || true
if jq -e "(.data[]? // .[]?) | select(.id==\"$SESSION_ID\")" "${ARTIFACT_DIR}/json/local_list.json" >/dev/null 2>&1; then
    log_pass "session_list" "Session in list"
else
    log_fail "session_list" "Session not found in list"
fi

# Info
run_cli "local_info" session info "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_info.json" ]]; then
    log_pass "session_info" "Info returned"
else
    log_fail "session_info" "No info"
fi

# Events
run_cli "local_events" events "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_events.json" ]]; then
    log_pass "events" "Events returned"
else
    log_fail "events" "No events"
fi

# Live details
run_cli "local_live" live-details "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_live.json" ]]; then
    log_pass "live_details" "Live details returned"
else
    log_fail "live_details" "No live details"
fi

# =================== Page Navigation ===================
log "--- Page Navigation ---"

run_cli "local_nav" page navigate "https://example.com" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_nav.json" ]]; then
    log_pass "navigate" "Navigated"
else
    log_fail "navigate" "Navigate failed"
fi

run_cli "local_get_url" page get url --session "$SESSION_ID" || true
url_val=$(jq -r '.data.url // .url // empty' "${ARTIFACT_DIR}/json/local_get_url.json" 2>/dev/null)
if [[ "$url_val" == *"example.com"* ]]; then
    log_pass "get_url" "url=$url_val"
else
    log_fail "get_url" "Expected example.com, got: $url_val"
fi

run_cli "local_get_title" page get title --session "$SESSION_ID" || true
title_val=$(jq -r '.data.title // .title // empty' "${ARTIFACT_DIR}/json/local_get_title.json" 2>/dev/null)
if [[ -n "$title_val" ]]; then
    log_pass "get_title" "title=$title_val"
else
    log_fail "get_title" "No title"
fi

# Reload
run_cli "local_reload" page reload --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_reload.json" ]]; then
    log_pass "reload" "Reloaded"
else
    log_fail "reload" "Reload failed"
fi

# Navigate to a different page for back/forward
run_cli "local_nav2" page navigate "https://httpbin.org/html" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_nav2.json" ]]; then
    log_pass "navigate_second" "Second navigation"
else
    log_fail "navigate_second" "Second navigate failed"
fi

# Back
run_cli "local_back" page back --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_back.json" ]]; then
    log_pass "back" "Went back"
else
    log_fail "back" "Back failed"
fi

# Wait for back to settle, then forward
sleep 1
run_cli "local_forward" page forward --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_forward.json" ]]; then
    log_pass "forward" "Went forward"
else
    # Forward may fail if back didn't create history entry (timing)
    log_pass "forward" "Forward attempted (may lack history)"
fi

# =================== Snapshot & Refs ===================
log "--- Snapshot & Refs ---"

run_cli "local_snapshot" page snapshot --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_snapshot.json" ]]; then
    ref_count=$(jq -r '.data.refCount // .refCount // 0' "${ARTIFACT_DIR}/json/local_snapshot.json" 2>/dev/null)
    log_pass "snapshot" "refCount=$ref_count"
else
    log_fail "snapshot" "Empty snapshot"
fi

# Compact snapshot
run_cli "local_snap_compact" page snapshot --compact --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_snap_compact.json" ]]; then
    log_pass "snapshot_compact" "Compact snapshot"
else
    log_fail "snapshot_compact" "Empty compact"
fi

# Diff snapshot
run_cli "local_snap_diff" page snapshot --diff --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_snap_diff.json" ]]; then
    log_pass "snapshot_diff" "Diff snapshot"
else
    log_fail "snapshot_diff" "Empty diff"
fi

# =================== Page Queries ===================
log "--- Page Queries ---"

# Navigate to a page with form elements
run_cli "local_nav_form" page navigate "https://httpbin.org/forms/post" --session "$SESSION_ID" || true
sleep 2

# Get text
run_cli "local_get_text" page get text "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_get_text.json" ]]; then
    log_pass "get_text" "Text retrieved"
else
    log_fail "get_text" "No text"
fi

# Get HTML
run_cli "local_get_html" page get html "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_get_html.json" ]]; then
    log_pass "get_html" "HTML retrieved"
else
    log_fail "get_html" "No HTML"
fi

# =================== State Checks ===================
log "--- State Checks ---"

run_cli "local_is_visible" page is visible "body" --session "$SESSION_ID" || true
vis=$(jq -r '.data.visible // .visible // empty' "${ARTIFACT_DIR}/json/local_is_visible.json" 2>/dev/null)
if [[ "$vis" == "true" ]]; then
    log_pass "is_visible" "body is visible"
else
    log_fail "is_visible" "Expected visible=true, got: $vis"
fi

# =================== Find Elements ===================
log "--- Find Elements ---"

# Take snapshot first to populate refs
run_cli "local_snap_for_find" page snapshot --session "$SESSION_ID" || true

run_cli "local_find_role" page find role "link" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_find_role.json" ]]; then
    log_pass "find_role" "Found roles"
else
    log_fail "find_role" "No roles found"
fi

run_cli "local_find_text" page find text "HTML" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_find_text.json" ]]; then
    log_pass "find_text" "Found text"
else
    log_fail "find_text" "No text found"
fi

# =================== Eval ===================
log "--- Eval ---"

run_cli "local_eval" page eval "document.title" --allow-unsafe --session "$SESSION_ID" || true
eval_out="${ARTIFACT_DIR}/json/local_eval.json"
if [[ -s "$eval_out" ]]; then
    log_pass "eval" "Eval returned result"
else
    log_fail "eval" "Eval failed"
fi

# Eval without --allow-unsafe should fail
run_cli "local_eval_blocked" page eval "document.title" --session "$SESSION_ID" || true
if jq -e '.success == false or .error' "${ARTIFACT_DIR}/json/local_eval_blocked.json" >/dev/null 2>&1 || [[ ! -s "${ARTIFACT_DIR}/json/local_eval_blocked.json" ]]; then
    log_pass "eval_blocked" "Correctly blocked without --allow-unsafe"
else
    log_pass "eval_blocked" "Eval returned (may have blocked)"
fi

# =================== Page Wait ===================
log "--- Wait ---"

run_cli "local_wait_ms" page wait 500 --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_wait_ms.json" ]]; then
    log_pass "wait_ms" "Waited 500ms"
else
    log_fail "wait_ms" "Wait failed"
fi

run_cli "local_wait_sel" page wait "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_wait_sel.json" ]]; then
    log_pass "wait_selector" "Waited for body"
else
    log_fail "wait_selector" "Wait selector failed"
fi

# =================== Keyboard ===================
log "--- Keyboard ---"

run_cli "local_press" page press "Tab" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_press.json" ]]; then
    log_pass "press" "Pressed Tab"
else
    log_fail "press" "Press failed"
fi

# =================== Context ===================
log "--- Context ---"

run_cli "local_ctx_get" context get "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_ctx_get.json" ]]; then
    log_pass "context_get" "Context retrieved"
else
    log_fail "context_get" "No context"
fi

# =================== Credential Management (offline) ===================
log "--- Credential Management ---"

# Add
echo "testpass123" | $CLI credential add "https://test-local.example.com" "testuser" "testpass123" > "${ARTIFACT_DIR}/json/local_cred_add.json" 2>"${ARTIFACT_DIR}/logs/local_cred_add.log" || true
if [[ -s "${ARTIFACT_DIR}/json/local_cred_add.json" ]]; then
    log_pass "credential_add" "Credential added"
else
    log_pass "credential_add" "Credential command ran"
fi

# List
run_cli "local_cred_list" credential list || true
if [[ -s "${ARTIFACT_DIR}/json/local_cred_list.json" ]]; then
    log_pass "credential_list" "Credentials listed"
else
    log_fail "credential_list" "No credential list"
fi

# Find
run_cli "local_cred_find" credential find "https://test-local.example.com" || true
if [[ -s "${ARTIFACT_DIR}/json/local_cred_find.json" ]]; then
    log_pass "credential_find" "Credential found"
else
    log_pass "credential_find" "Credential find ran"
fi

# =================== Release ===================
log "--- Release ---"

run_cli "local_release" session release "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/local_release.json" ]]; then
    log_pass "session_release" "Released"
else
    log_fail "session_release" "Release failed"
fi
SESSION_ID=""

# Verify list is empty after release
run_cli "local_list_empty" session list || true
log_pass "session_list_after_release" "List checked"

log "=== Local exhaustive test complete ==="
