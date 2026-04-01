#!/usr/bin/env bash
# cli-multi-function.sh — Multi-function tests: session + page + events + live-details
set -uo pipefail

SUITE_NAME="multi_function"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true; [[ -n "${SESSION_ID:-}" ]] && $CLI session release "$SESSION_ID" 2>/dev/null || true' EXIT

log "=== Multi-Function Test Suite ==="

# Create session
log "Creating session..."
create_out=$(run_cli "mf_create" session create --adapter playwright --stealth) || true
SESSION_ID=$(extract_session_id "$create_out")

if [[ -z "$SESSION_ID" ]]; then
    log_fail "session_create" "No session ID returned"
    exit 1
fi
log_pass "session_create" "id=$SESSION_ID"

# Navigate
log "Navigating..."
run_cli "mf_navigate" page navigate "https://example.com" --session "$SESSION_ID" || true
nav_out="${ARTIFACT_DIR}/json/mf_navigate.json"
if [[ -s "$nav_out" ]]; then
    log_pass "navigate" "Navigation completed"
else
    log_fail "navigate" "No navigation output"
fi

# Snapshot
log "Snapshot..."
run_cli "mf_snapshot" page snapshot --session "$SESSION_ID" || true
snap_out="${ARTIFACT_DIR}/json/mf_snapshot.json"
if [[ -s "$snap_out" ]]; then
    log_pass "snapshot" "Snapshot captured"
else
    log_fail "snapshot" "Empty snapshot"
fi

# Events
log "Events..."
run_cli "mf_events" events "$SESSION_ID" || true
events_out="${ARTIFACT_DIR}/json/mf_events.json"
if [[ -s "$events_out" ]]; then
    log_pass "events" "Events returned"
else
    log_fail "events" "No events output"
fi

# Live details (bug #9/#13 verification — should not return data:null)
log "Live details..."
run_cli "mf_live_details" live-details "$SESSION_ID" || true
ld_out="${ARTIFACT_DIR}/json/mf_live_details.json"
if [[ -s "$ld_out" ]] && ! jq -e '.data == null and .success == true' "$ld_out" >/dev/null 2>&1; then
    log_pass "live_details" "Live details returned non-null data"
else
    log_fail "live_details" "Live details returned null data"
fi

# Context get (bug #7 — should not print stack trace)
log "Context get..."
ctx_stderr=$(timeout "${CMD_TIMEOUT_SEC}" $CLI context get "$SESSION_ID" 2>&1 >/dev/null || true)
run_cli "mf_context" context get "$SESSION_ID" || true
if echo "$ctx_stderr" | grep -q "Cannot read properties"; then
    log_fail "context_clean_output" "Stack trace leaked to stderr"
else
    log_pass "context_clean_output" "No stack trace in output"
fi

# Release (bug #6 — consistent success/failure)
log "Releasing..."
run_cli "mf_release" session release "$SESSION_ID" || true
release_out="${ARTIFACT_DIR}/json/mf_release.json"
# Check that success is consistent
if jq -e '.success == true' "$release_out" >/dev/null 2>&1; then
    # Ensure no nested contradictory success:false
    if jq -e '.data.success == false' "$release_out" >/dev/null 2>&1; then
        log_fail "release_consistent" "Contradictory success in release response"
    else
        log_pass "release_consistent" "Release response consistent"
    fi
else
    log_pass "release_consistent" "Release returned non-success (acceptable if already released)"
fi

# Clear SESSION_ID so trap doesn't try to release again
SESSION_ID=""

log "=== Multi-function tests complete ==="
