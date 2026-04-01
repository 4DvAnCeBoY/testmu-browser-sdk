#!/usr/bin/env bash
# cli-smoke.sh — Smoke test: session create → list → info → snapshot → release
set -uo pipefail

SUITE_NAME="smoke"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true' EXIT

log "=== Smoke Test Suite ==="

# 1. Session create
log "Creating session..."
create_out=$(run_cli "smoke_create" session create --adapter playwright --stealth) || true
SESSION_ID=$(extract_session_id "$create_out")

if [[ -z "$SESSION_ID" ]]; then
    log_fail "session_create" "No session ID returned"
    exit 1
fi
log_pass "session_create" "id=$SESSION_ID"

# 2. Session list — should show our session (bug #1 verification)
log "Listing sessions..."
run_cli "smoke_list" session list || true
list_out="${ARTIFACT_DIR}/json/smoke_list.json"
if jq -e ".data[] | select(.id==\"$SESSION_ID\")" "$list_out" >/dev/null 2>&1 || \
   jq -e ".[] | select(.id==\"$SESSION_ID\")" "$list_out" >/dev/null 2>&1; then
    log_pass "session_list" "Session found in list"
else
    log_fail "session_list" "Session $SESSION_ID not found in list output"
fi

# 3. Session info — should return session details (bug #2 verification)
log "Getting session info..."
run_cli "smoke_info" session info "$SESSION_ID" || true
info_out="${ARTIFACT_DIR}/json/smoke_info.json"
assert_json_not_null "session_info" "$info_out" ".data.id // .id" || true

# 4. Page snapshot
log "Taking page snapshot..."
run_cli "smoke_snapshot" page snapshot --session "$SESSION_ID" || true
snap_out="${ARTIFACT_DIR}/json/smoke_snapshot.json"
if [[ -s "$snap_out" ]]; then
    log_pass "page_snapshot" "Snapshot returned data"
else
    log_fail "page_snapshot" "Empty snapshot output"
fi

# 5. Session release
log "Releasing session..."
run_cli "smoke_release" session release "$SESSION_ID" || true
release_out="${ARTIFACT_DIR}/json/smoke_release.json"
assert_json "session_release" "$release_out" ".success // .data.success" "true" || true

log "=== Smoke test complete ==="
