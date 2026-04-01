#!/usr/bin/env bash
# cli-test-harness.sh — Shared test harness for CLI test suites
set -euo pipefail

CLI="node ./dist/cli/index.js"
CMD_TIMEOUT_SEC="${CMD_TIMEOUT_SEC:-20}"
EXIT_TIMEOUT_SEC="${EXIT_TIMEOUT_SEC:-120}"

# Generate unique RUN_ID with PID + random suffix to avoid parallel collisions (bug #14 fix)
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$-$(head -c4 /dev/urandom | xxd -p)}"
ARTIFACT_DIR="artifacts/${RUN_ID}"
mkdir -p "${ARTIFACT_DIR}/logs" "${ARTIFACT_DIR}/json"

SUMMARY_TSV="${ARTIFACT_DIR}/summary.tsv"
echo -e "suite\ttest\tresult\tdetail" > "$SUMMARY_TSV"

# Counters (written to file for subshell safety — bug #10 fix)
PASS_FILE="${ARTIFACT_DIR}/.pass_count"
FAIL_FILE="${ARTIFACT_DIR}/.fail_count"
echo 0 > "$PASS_FILE"
echo 0 > "$FAIL_FILE"

SUITE_NAME="${SUITE_NAME:-unnamed}"

log() { echo "[$(date +%H:%M:%S)] $*"; }
log_pass() { log "PASS: $1"; echo -e "${SUITE_NAME}\t${1}\tPASS\t${2:-}" >> "$SUMMARY_TSV"; }
log_fail() { log "FAIL: $1 — $2"; echo -e "${SUITE_NAME}\t${1}\tFAIL\t${2}" >> "$SUMMARY_TSV"; }

# Run a CLI command with timeout, capture JSON output (stderr to .log)
run_cli() {
    local label="$1"; shift
    local outfile="${ARTIFACT_DIR}/json/${label}.json"
    local errfile="${ARTIFACT_DIR}/logs/${label}.log"
    if timeout "${CMD_TIMEOUT_SEC}" $CLI "$@" > "$outfile" 2>"$errfile"; then
        echo "$outfile"
    else
        echo "$outfile"
        return 1
    fi
}

# Assert that a JSON file contains a field matching a value
assert_json() {
    local label="$1" file="$2" jq_expr="$3" expected="$4"
    local actual
    actual=$(jq -r "$jq_expr" "$file" 2>/dev/null || echo "PARSE_ERROR")
    if [[ "$actual" == "$expected" ]]; then
        log_pass "$label" "$jq_expr == $expected"
        return 0
    else
        log_fail "$label" "expected $jq_expr=$expected, got $actual"
        return 1
    fi
}

# Assert JSON field is not null/empty
assert_json_not_null() {
    local label="$1" file="$2" jq_expr="$3"
    local actual
    actual=$(jq -r "$jq_expr" "$file" 2>/dev/null || echo "null")
    if [[ "$actual" != "null" && "$actual" != "" ]]; then
        log_pass "$label" "$jq_expr is not null"
        return 0
    else
        log_fail "$label" "$jq_expr is null or empty"
        return 1
    fi
}

# Finalize suite — recompute counts from TSV (bug #10 fix)
finalize_suite() {
    local pass_count fail_count total
    pass_count=$(grep -c $'\tPASS\t' "$SUMMARY_TSV" 2>/dev/null || true)
    pass_count=${pass_count:-0}
    fail_count=$(grep -c $'\tFAIL\t' "$SUMMARY_TSV" 2>/dev/null || true)
    fail_count=${fail_count:-0}
    total=$((pass_count + fail_count))

    cat > "${ARTIFACT_DIR}/summary.txt" <<EOF
Suite: ${SUITE_NAME}
Run ID: ${RUN_ID}
Pass: ${pass_count}
Fail: ${fail_count}
Total: ${total}
EOF

    jq -n \
        --arg suite "$SUITE_NAME" \
        --arg runId "$RUN_ID" \
        --argjson pass "$pass_count" \
        --argjson fail "$fail_count" \
        --argjson total "$total" \
        '{suite: $suite, runId: $runId, pass: $pass, fail: $fail, total: $total}' \
        > "${ARTIFACT_DIR}/summary.json"

    log "=== ${SUITE_NAME} complete: ${pass_count} pass, ${fail_count} fail, ${total} total ==="
    log "Artifacts: ${ARTIFACT_DIR}"

    if [[ "$fail_count" -gt 0 ]]; then
        return 1
    fi
    return 0
}

# Extract session ID from CLI JSON output (handles non-JSON lines — bug #3 workaround)
extract_session_id() {
    local file="$1"
    # Try direct jq first (clean JSON output)
    local id
    id=$(jq -r '.data.id // .id // empty' "$file" 2>/dev/null | head -n1)
    if [[ -n "$id" ]]; then echo "$id"; return; fi
    # Fall back: parse each line as JSON, find the one with .data.id or .id
    grep -o '{.*}' "$file" 2>/dev/null | while IFS= read -r line; do
        id=$(echo "$line" | jq -r '.data.id // .id // empty' 2>/dev/null)
        if [[ -n "$id" ]]; then echo "$id"; return; fi
    done | head -n1
}
