#!/bin/bash
# Agent page interaction template
# Shows a typical AI agent flow: navigate, inspect, interact, verify, release.

set -euo pipefail

TARGET_URL="${1:-https://example.com}"

# 1. Create a session
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer | jq -r '.data.id')
echo "Session: $SESSION_ID"

# 2. Navigate to the target page
testmu-browser-cloud page navigate "$TARGET_URL" --session "$SESSION_ID"

# 3. Take a compact snapshot to discover @ref IDs
echo "--- Initial snapshot ---"
testmu-browser-cloud page snapshot --compact --session "$SESSION_ID"

# 4. Click an element by @ref (replace @e5 with the actual ref from snapshot)
testmu-browser-cloud page click "@e5" --session "$SESSION_ID"

# 5. Fill a form field
testmu-browser-cloud page fill "#username" "myuser" --session "$SESSION_ID"
testmu-browser-cloud page fill "#password" "mypassword" --session "$SESSION_ID"

# 6. Submit the form
testmu-browser-cloud page click "[type=submit]" --session "$SESSION_ID"

# 7. Snapshot diff to verify what changed after the interaction
echo "--- Diff after submit ---"
testmu-browser-cloud page snapshot --diff --session "$SESSION_ID"

# 8. Confirm expected outcome
RESULT=$(testmu-browser-cloud page get text ".status-message" --session "$SESSION_ID" | jq -r '.data')
echo "Result: $RESULT"

# 9. Release the session
testmu-browser-cloud session release "$SESSION_ID"
echo "Done."
