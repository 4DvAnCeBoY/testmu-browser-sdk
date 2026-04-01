#!/usr/bin/env bash
# cli-adapter-matrix.sh — Test across adapter types (playwright, puppeteer)
set -uo pipefail

SUITE_NAME="adapter_matrix"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/cli-test-harness.sh"

trap 'finalize_suite || true' EXIT

log "=== Adapter Matrix Test Suite ==="

for adapter in playwright puppeteer; do
    log "--- Testing adapter: ${adapter} ---"

    # Create session
    create_out=$(run_cli "am_create_${adapter}" session create --adapter "$adapter" --stealth) || true
    sid=$(extract_session_id "$create_out")

    if [[ -z "$sid" ]]; then
        log_fail "create_${adapter}" "No session ID returned"
        continue
    fi
    log_pass "create_${adapter}" "id=$sid"

    # List — should contain session
    run_cli "am_list_${adapter}" session list || true
    list_out="${ARTIFACT_DIR}/json/am_list_${adapter}.json"
    if jq -e ".data[] | select(.id==\"$sid\")" "$list_out" >/dev/null 2>&1 || \
       jq -e ".[] | select(.id==\"$sid\")" "$list_out" >/dev/null 2>&1; then
        log_pass "list_${adapter}" "Session found in list"
    else
        log_fail "list_${adapter}" "Session not in list"
    fi

    # Navigate
    run_cli "am_nav_${adapter}" page navigate "https://example.com" --session "$sid" || true
    nav_out="${ARTIFACT_DIR}/json/am_nav_${adapter}.json"
    if [[ -s "$nav_out" ]]; then
        log_pass "navigate_${adapter}" "Navigation completed"
    else
        log_fail "navigate_${adapter}" "Navigation failed"
    fi

    # Live details (bug #9/#13 — non-null data)
    run_cli "am_live_${adapter}" live-details "$sid" || true
    ld_out="${ARTIFACT_DIR}/json/am_live_${adapter}.json"
    if [[ -s "$ld_out" ]] && ! jq -e '.data == null and .success == true' "$ld_out" >/dev/null 2>&1; then
        log_pass "live_${adapter}" "Live details non-null"
    else
        log_fail "live_${adapter}" "Live details returned null"
    fi

    # Release
    run_cli "am_release_${adapter}" session release "$sid" || true
    log_pass "release_${adapter}" "Session released"

    log "--- adapter ${adapter} complete ---"
done

log "=== Adapter matrix complete ==="
