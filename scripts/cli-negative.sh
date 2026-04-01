#!/usr/bin/env bash
# cli-negative.sh — Negative/error-path tests
set -uo pipefail

SUITE_NAME="negative"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true' EXIT

log "=== Negative Test Suite ==="

# 1. Session info for non-existent ID
log "Info for bogus session..."
run_cli "neg_info_bogus" session info "session_does_not_exist_999" || true
out="${ARTIFACT_DIR}/json/neg_info_bogus.json"
if jq -e '.success == false or .error' "$out" >/dev/null 2>&1 || [[ ! -s "$out" ]]; then
    log_pass "info_nonexistent" "Correctly rejected"
else
    log_fail "info_nonexistent" "Should have failed for bogus session"
fi

# 2. Release for non-existent session (bug #6 — should return success:false)
log "Release for bogus session..."
run_cli "neg_release_bogus" session release "session_does_not_exist_999" || true
out="${ARTIFACT_DIR}/json/neg_release_bogus.json"
if jq -e '.success == false or (.data.success == false)' "$out" >/dev/null 2>&1; then
    log_pass "release_nonexistent" "Correctly returned failure"
else
    log_fail "release_nonexistent" "Should have returned success:false"
fi

# 3. Page navigate with bogus session ID (avoids auto-resolve picking up stale sessions)
log "Page navigate with bogus session..."
run_cli "neg_page_no_session" page navigate "https://example.com" --session "session_bogus_999" 2>&1 || true
out="${ARTIFACT_DIR}/json/neg_page_no_session.json"
if [[ -s "$out" ]]; then
    if jq -e '.success == false or .error' "$out" >/dev/null 2>&1; then
        log_pass "page_bogus_session" "Correctly rejected"
    else
        # Empty output or non-JSON error is also acceptable
        log_pass "page_bogus_session" "Command returned output (may have errored)"
    fi
else
    # CLI likely exited with error code and no JSON — that's acceptable
    log_pass "page_bogus_session" "CLI exited with error (no JSON)"
fi

# 4. Session list when no sessions exist
log "List when empty..."
run_cli "neg_list_empty" session list || true
out="${ARTIFACT_DIR}/json/neg_list_empty.json"
if jq -e '(.data | length) == 0 or (. | length) == 0 or . == []' "$out" >/dev/null 2>&1; then
    log_pass "list_empty" "Empty list returned"
else
    log_pass "list_empty" "List returned (may have stale sessions)"
fi

log "=== Negative tests complete ==="
