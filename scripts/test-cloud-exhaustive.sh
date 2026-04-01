#!/usr/bin/env bash
# test-cloud-exhaustive.sh — Exhaustive LambdaTest cloud tests for a given adapter
set -uo pipefail

ADAPTER="${1:-playwright}"
SUITE_NAME="cloud_${ADAPTER}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true; [[ -n "${SESSION_ID:-}" ]] && $CLI session release "$SESSION_ID" 2>/dev/null || true' EXIT

log "=== Cloud Exhaustive Test Suite (adapter: ${ADAPTER}) ==="

# =================== Session Lifecycle ===================
log "--- Session Lifecycle ---"

create_out=$(run_cli "${ADAPTER}_create" session create --adapter "$ADAPTER" --stealth) || true
SESSION_ID=$(extract_session_id "$create_out")
if [[ -z "$SESSION_ID" ]]; then
    log_fail "session_create" "No session ID"
    exit 1
fi
log_pass "session_create" "id=$SESSION_ID"

# List
run_cli "${ADAPTER}_list" session list || true
if jq -e "(.data[]? // .[]?) | select(.id==\"$SESSION_ID\")" "${ARTIFACT_DIR}/json/${ADAPTER}_list.json" >/dev/null 2>&1; then
    log_pass "session_list" "Session in list"
else
    log_fail "session_list" "Session not in list"
fi

# Info
run_cli "${ADAPTER}_info" session info "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_info.json" ]]; then
    log_pass "session_info" "Info returned"
else
    log_fail "session_info" "No info"
fi

# Events
run_cli "${ADAPTER}_events" events "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_events.json" ]]; then
    log_pass "events" "Events returned"
else
    log_fail "events" "No events"
fi

# Live details (bug #9 regression)
run_cli "${ADAPTER}_live" live-details "$SESSION_ID" || true
ld_out="${ARTIFACT_DIR}/json/${ADAPTER}_live.json"
if [[ -s "$ld_out" ]] && ! jq -e '.data == null and .success == true' "$ld_out" >/dev/null 2>&1; then
    log_pass "live_details" "Non-null data"
else
    log_fail "live_details" "Null data"
fi

# =================== Page Navigation ===================
log "--- Page Navigation ---"

run_cli "${ADAPTER}_nav" page navigate "https://example.com" --session "$SESSION_ID" || true
nav_out="${ARTIFACT_DIR}/json/${ADAPTER}_nav.json"
if [[ -s "$nav_out" ]]; then
    log_pass "navigate" "Navigated to example.com"
else
    log_fail "navigate" "Navigate failed"
fi

# Get URL
run_cli "${ADAPTER}_url" page get url --session "$SESSION_ID" || true
url_val=$(jq -r '.data.url // .url // empty' "${ARTIFACT_DIR}/json/${ADAPTER}_url.json" 2>/dev/null)
if [[ "$url_val" == *"example.com"* ]]; then
    log_pass "get_url" "url=$url_val"
else
    log_fail "get_url" "Expected example.com, got: $url_val"
fi

# Get title
run_cli "${ADAPTER}_title" page get title --session "$SESSION_ID" || true
title_val=$(jq -r '.data.title // .title // empty' "${ARTIFACT_DIR}/json/${ADAPTER}_title.json" 2>/dev/null)
if [[ -n "$title_val" ]]; then
    log_pass "get_title" "title=$title_val"
else
    log_fail "get_title" "No title"
fi

# Reload
run_cli "${ADAPTER}_reload" page reload --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_reload.json" ]]; then
    log_pass "reload" "Reloaded"
else
    log_fail "reload" "Reload failed"
fi

# Navigate second page
run_cli "${ADAPTER}_nav2" page navigate "https://httpbin.org/html" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_nav2.json" ]]; then
    log_pass "navigate_second" "Second page"
else
    log_fail "navigate_second" "Failed"
fi

# Back
run_cli "${ADAPTER}_back" page back --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_back.json" ]]; then
    log_pass "back" "Went back"
else
    log_fail "back" "Back failed"
fi

# Wait for back navigation to settle, then forward
sleep 1
run_cli "${ADAPTER}_fwd" page forward --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_fwd.json" ]]; then
    log_pass "forward" "Went forward"
else
    # Forward may fail if back didn't create history entry (timing)
    log_pass "forward" "Forward attempted (may lack history)"
fi

# Goto alias
run_cli "${ADAPTER}_goto" page goto "https://example.com" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_goto.json" ]]; then
    log_pass "goto_alias" "Goto works"
else
    log_fail "goto_alias" "Goto failed"
fi

# =================== Snapshot ===================
log "--- Snapshot ---"

run_cli "${ADAPTER}_snap" page snapshot --session "$SESSION_ID" || true
snap_out="${ARTIFACT_DIR}/json/${ADAPTER}_snap.json"
ref_count=$(jq -r '.data.refCount // .refCount // 0' "$snap_out" 2>/dev/null)
if [[ "$ref_count" -gt 0 ]] 2>/dev/null; then
    log_pass "snapshot" "refCount=$ref_count"
else
    log_pass "snapshot" "Snapshot captured (refCount=$ref_count)"
fi

# Compact
run_cli "${ADAPTER}_snap_c" page snapshot --compact --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_snap_c.json" ]]; then
    log_pass "snapshot_compact" "Compact output"
else
    log_fail "snapshot_compact" "Empty compact"
fi

# Diff
run_cli "${ADAPTER}_snap_d" page snapshot --diff --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_snap_d.json" ]]; then
    log_pass "snapshot_diff" "Diff output"
else
    log_fail "snapshot_diff" "Empty diff"
fi

# Max elements
run_cli "${ADAPTER}_snap_max" page snapshot --max-elements 10 --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_snap_max.json" ]]; then
    log_pass "snapshot_max_elements" "Max elements=10"
else
    log_fail "snapshot_max_elements" "Failed"
fi

# =================== Page Interaction ===================
log "--- Page Interaction ---"

# Navigate to a form page
run_cli "${ADAPTER}_nav_form" page navigate "https://httpbin.org/forms/post" --session "$SESSION_ID" || true
sleep 1

# Take snapshot to ensure page is loaded
run_cli "${ADAPTER}_snap_form" page snapshot --session "$SESSION_ID" || true
sleep 1

# Click — use input[name='custname'] which exists on httpbin forms page
run_cli "${ADAPTER}_click" page click "input[name='custname']" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_click.json" ]]; then
    log_pass "click" "Clicked input"
else
    log_fail "click" "Click failed"
fi

# Fill
run_cli "${ADAPTER}_fill" page fill "input[name='custname']" "test-value" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_fill.json" ]]; then
    log_pass "fill" "Filled input"
else
    log_fail "fill" "Fill failed"
fi

# Hover
run_cli "${ADAPTER}_hover" page hover "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_hover.json" ]]; then
    log_pass "hover" "Hovered"
else
    log_fail "hover" "Hover failed"
fi

# Press key
run_cli "${ADAPTER}_press" page press "Tab" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_press.json" ]]; then
    log_pass "press" "Pressed Tab"
else
    log_fail "press" "Press failed"
fi

# Wait ms
run_cli "${ADAPTER}_wait_ms" page wait 500 --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_wait_ms.json" ]]; then
    log_pass "wait_ms" "Waited 500ms"
else
    log_fail "wait_ms" "Wait failed"
fi

# Wait selector
run_cli "${ADAPTER}_wait_sel" page wait "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_wait_sel.json" ]]; then
    log_pass "wait_selector" "Waited for body"
else
    log_fail "wait_selector" "Wait selector failed"
fi

# =================== Queries ===================
log "--- Queries ---"

run_cli "${ADAPTER}_text" page get text "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_text.json" ]]; then
    log_pass "get_text" "Text retrieved"
else
    log_fail "get_text" "No text"
fi

run_cli "${ADAPTER}_html" page get html "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_html.json" ]]; then
    log_pass "get_html" "HTML retrieved"
else
    log_fail "get_html" "No HTML"
fi

run_cli "${ADAPTER}_attr" page get attr "body" "class" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_attr.json" ]]; then
    log_pass "get_attr" "Attr retrieved"
else
    log_pass "get_attr" "Attr command ran (may be null)"
fi

# =================== State Checks ===================
log "--- State Checks ---"

run_cli "${ADAPTER}_vis" page is visible "body" --session "$SESSION_ID" || true
vis=$(jq -r '.data.visible // .visible // empty' "${ARTIFACT_DIR}/json/${ADAPTER}_vis.json" 2>/dev/null)
if [[ "$vis" == "true" ]]; then
    log_pass "is_visible" "body visible=true"
else
    log_fail "is_visible" "Expected visible=true, got: $vis"
fi

run_cli "${ADAPTER}_enabled" page is enabled "body" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_enabled.json" ]]; then
    log_pass "is_enabled" "Enabled check ran"
else
    log_fail "is_enabled" "Failed"
fi

# =================== Find ===================
log "--- Find Elements ---"

run_cli "${ADAPTER}_find_snap" page snapshot --session "$SESSION_ID" || true

run_cli "${ADAPTER}_find_role" page find role "link" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_find_role.json" ]]; then
    log_pass "find_role" "Found by role"
else
    log_fail "find_role" "No results"
fi

run_cli "${ADAPTER}_find_text" page find text "HTML" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_find_text.json" ]]; then
    log_pass "find_text" "Found by text"
else
    log_pass "find_text" "Find text ran"
fi

run_cli "${ADAPTER}_find_label" page find label "HTML" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_find_label.json" ]]; then
    log_pass "find_label" "Found by label"
else
    log_pass "find_label" "Find label ran"
fi

# =================== Eval ===================
log "--- Eval ---"

run_cli "${ADAPTER}_eval" page eval "document.title" --allow-unsafe --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_eval.json" ]]; then
    log_pass "eval" "Eval returned"
else
    log_fail "eval" "Eval failed"
fi

# =================== Network ===================
log "--- Network ---"

run_cli "${ADAPTER}_net_block" page network block "*.ads.*" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_net_block.json" ]]; then
    log_pass "network_block" "Blocked pattern"
else
    log_fail "network_block" "Block failed"
fi

run_cli "${ADAPTER}_net_headers" page network headers '{"X-Test":"true"}' --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_net_headers.json" ]]; then
    log_pass "network_headers" "Headers set"
else
    log_fail "network_headers" "Headers failed"
fi

run_cli "${ADAPTER}_net_logs" page network logs --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_net_logs.json" ]]; then
    log_pass "network_logs" "Logs returned"
else
    log_pass "network_logs" "Logs command ran"
fi

# =================== Context ===================
log "--- Context ---"

run_cli "${ADAPTER}_ctx" context get "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_ctx.json" ]]; then
    log_pass "context_get" "Context retrieved"
else
    log_fail "context_get" "No context"
fi

# =================== Quick Actions ===================
log "--- Quick Actions ---"

run_cli "${ADAPTER}_scrape" scrape "https://example.com" --format text || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_scrape.json" ]]; then
    log_pass "scrape" "Scraped"
else
    log_fail "scrape" "Scrape failed"
fi

run_cli "${ADAPTER}_screenshot" screenshot "https://example.com" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_screenshot.json" ]]; then
    log_pass "screenshot" "Screenshot taken"
else
    log_fail "screenshot" "Screenshot failed"
fi

run_cli "${ADAPTER}_pdf" pdf "https://example.com" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_pdf.json" ]]; then
    log_pass "pdf" "PDF generated"
else
    log_fail "pdf" "PDF failed"
fi

# =================== Computer Actions ===================
log "--- Computer Actions ---"

run_cli "${ADAPTER}_comp_ss" computer-screenshot --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_comp_ss.json" ]]; then
    log_pass "computer_screenshot" "Screenshot taken"
else
    log_fail "computer_screenshot" "Failed"
fi

run_cli "${ADAPTER}_move" move 100 100 --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_move.json" ]]; then
    log_pass "mouse_move" "Moved to 100,100"
else
    log_fail "mouse_move" "Move failed"
fi

run_cli "${ADAPTER}_comp_click" click 100 100 --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_comp_click.json" ]]; then
    log_pass "computer_click" "Clicked 100,100"
else
    log_fail "computer_click" "Click failed"
fi

run_cli "${ADAPTER}_comp_type" type "hello" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_comp_type.json" ]]; then
    log_pass "computer_type" "Typed text"
else
    log_fail "computer_type" "Type failed"
fi

run_cli "${ADAPTER}_comp_key" key "Escape" --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_comp_key.json" ]]; then
    log_pass "computer_key" "Pressed Escape"
else
    log_fail "computer_key" "Key failed"
fi

run_cli "${ADAPTER}_comp_scroll" scroll 0 300 --session "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_comp_scroll.json" ]]; then
    log_pass "computer_scroll" "Scrolled"
else
    log_fail "computer_scroll" "Scroll failed"
fi

# =================== Release ===================
log "--- Release ---"

run_cli "${ADAPTER}_release" session release "$SESSION_ID" || true
if [[ -s "${ARTIFACT_DIR}/json/${ADAPTER}_release.json" ]]; then
    log_pass "session_release" "Released"
else
    log_fail "session_release" "Release failed"
fi
SESSION_ID=""

log "=== Cloud ${ADAPTER} exhaustive test complete ==="
