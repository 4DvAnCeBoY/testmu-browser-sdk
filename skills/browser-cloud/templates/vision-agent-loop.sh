#!/bin/bash
# AI vision agent loop: screenshot → decide → act
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer | jq -r '.data.id')

# Take initial screenshot
testmu-browser-cloud computer-screenshot --session $SESSION_ID --output frame.png

# Agent analyzes frame.png and decides next action...
# testmu-browser-cloud click <x> <y> --session $SESSION_ID
# testmu-browser-cloud type "text" --session $SESSION_ID

# Cleanup
testmu-browser-cloud session release $SESSION_ID
