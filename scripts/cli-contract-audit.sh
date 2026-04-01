#!/usr/bin/env bash
# cli-contract-audit.sh — Verify JSON contract shapes for all CLI commands
# Bug #11 fix: assertions continue on failure and always call finalize_suite
set -uo pipefail

SUITE_NAME="contract_audit"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true; [[ -n "${SESSION_ID:-}" ]] && $CLI session release "$SESSION_ID" 2>/dev/null || true' EXIT

log "=== Contract Audit Suite ==="

# Create session for contract testing
create_out=$(run_cli "contract_create" session create --adapter playwright --stealth) || true
SESSION_ID=$(extract_session_id "$create_out")

if [[ -z "$SESSION_ID" ]]; then
    log_fail "session_create" "No session ID"
    exit 1
fi
log_pass "session_create" "id=$SESSION_ID"

# Contract: session list returns array
run_cli "contract_list" session list || true
list_out="${ARTIFACT_DIR}/json/contract_list.json"
if jq -e 'type == "array" or (.data | type) == "array"' "$list_out" >/dev/null 2>&1; then
    log_pass "contract_list" "Returns array"
else
    log_fail "contract_list" "Expected array shape"
fi

# Contract: session info returns object with id
run_cli "contract_info" session info "$SESSION_ID" || true
info_out="${ARTIFACT_DIR}/json/contract_info.json"
if jq -e '.id or .data.id' "$info_out" >/dev/null 2>&1; then
    log_pass "contract_info" "Has id field"
else
    log_fail "contract_info" "Missing id field"
fi

# Contract: live-details returns non-null data (bug #9)
run_cli "contract_live_details" live-details "$SESSION_ID" || true
ld_out="${ARTIFACT_DIR}/json/contract_live_details.json"
if [[ -s "$ld_out" ]] && ! jq -e '.data == null and .success == true' "$ld_out" >/dev/null 2>&1; then
    log_pass "contract_live_details" "Non-null data"
else
    log_fail "contract_live_details" "Null data in success response"
fi

# Contract: events returns something
run_cli "contract_events" events "$SESSION_ID" || true
events_out="${ARTIFACT_DIR}/json/contract_events.json"
if [[ -s "$events_out" ]]; then
    log_pass "contract_events" "Events returned"
else
    log_fail "contract_events" "Empty events"
fi

# Contract: page snapshot returns data
run_cli "contract_snapshot" page snapshot --session "$SESSION_ID" || true
snap_out="${ARTIFACT_DIR}/json/contract_snapshot.json"
if [[ -s "$snap_out" ]]; then
    log_pass "contract_snapshot" "Snapshot has data"
else
    log_fail "contract_snapshot" "Empty snapshot"
fi

# Contract: session release returns success field
run_cli "contract_release" session release "$SESSION_ID" || true
release_out="${ARTIFACT_DIR}/json/contract_release.json"
if jq -e '.success != null or .data.success != null' "$release_out" >/dev/null 2>&1; then
    log_pass "contract_release" "Has success field"
else
    log_fail "contract_release" "Missing success field"
fi

SESSION_ID=""
log "=== Contract audit complete ==="
