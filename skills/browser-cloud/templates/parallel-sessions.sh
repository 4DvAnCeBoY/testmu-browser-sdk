#!/bin/bash
# Run multiple browser sessions concurrently
S1=$(testmu-browser-cloud session create --adapter playwright | jq -r '.data.id')
S2=$(testmu-browser-cloud session create --adapter playwright | jq -r '.data.id')

testmu-browser-cloud scrape https://site-a.com &
testmu-browser-cloud scrape https://site-b.com &
wait

testmu-browser-cloud session release $S1
testmu-browser-cloud session release $S2
