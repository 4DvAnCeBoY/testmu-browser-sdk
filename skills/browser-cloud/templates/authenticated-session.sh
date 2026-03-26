#!/bin/bash
# Login once, save profile, reuse across runs
SESSION_ID=$(testmu-browser-cloud session create --adapter playwright --stealth --profile my-app | jq -r '.data.id')

# First run: login
testmu-browser-cloud click 400 300 --session $SESSION_ID
testmu-browser-cloud type "username" --session $SESSION_ID
testmu-browser-cloud key Tab --session $SESSION_ID
testmu-browser-cloud type "password" --session $SESSION_ID
testmu-browser-cloud key Enter --session $SESSION_ID

# Save profile for next time
testmu-browser-cloud profile save my-app --session $SESSION_ID
testmu-browser-cloud session release $SESSION_ID
