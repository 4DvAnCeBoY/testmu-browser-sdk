#!/usr/bin/env node
// Browser Cloud — Session start hook
// Checks if credentials are configured, prompts setup if not

const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.testmuai', 'config.json');
const hasEnvCreds = process.env.LT_USERNAME && process.env.LT_ACCESS_KEY;

let hasFileCreds = false;
try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    hasFileCreds = !!(config.username && config.accessKey);
  }
} catch (e) {
  // ignore
}

if (!hasEnvCreds && !hasFileCreds) {
  // Output to stderr so Claude Code sees it as a system message
  process.stderr.write(
    '[Browser Cloud] TestMu AI credentials not configured. ' +
    'Run `testmu-browser-cloud setup` to configure your LambdaTest credentials. ' +
    'Get credentials at https://www.testmuai.com\n'
  );
} else {
  process.stderr.write('[Browser Cloud] Plugin ready — TestMu AI credentials configured.\n');
}
