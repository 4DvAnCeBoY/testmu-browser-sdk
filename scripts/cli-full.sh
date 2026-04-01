#!/usr/bin/env bash
# cli-full.sh — Full test suite: runs smoke, negative, and page-service suites
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXIT_CODE=0

echo "=== Full CLI Test Suite ==="
echo ""

# Run each suite, collecting exit codes
for suite in cli-smoke.sh cli-negative.sh verify-page-service.sh; do
    echo "--- Running ${suite} ---"
    if bash "${SCRIPT_DIR}/${suite}"; then
        echo "--- ${suite}: PASSED ---"
    else
        echo "--- ${suite}: FAILED ---"
        EXIT_CODE=1
    fi
    echo ""
done

if [[ "$EXIT_CODE" -eq 0 ]]; then
    echo "=== ALL SUITES PASSED ==="
else
    echo "=== SOME SUITES FAILED ==="
fi

exit "$EXIT_CODE"
