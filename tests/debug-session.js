const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const CLI = 'npx testmu-browser-cloud';
const opts = { encoding: 'utf8', timeout: 90000, env: process.env };

function extractJson(raw) {
    const lines = raw.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('{')) {
            try { return JSON.parse(lines.slice(i).join('\n')); } catch {}
        }
    }
    throw new Error('No JSON: ' + raw);
}

// Create session
const raw1 = execSync(CLI + ' session create --adapter puppeteer', opts);
const session = extractJson(raw1);
console.log('Session:', session.data.id);

// Check disk
const dir = os.homedir() + '/.testmuai/sessions/' + session.data.id;
console.log('Dir exists:', fs.existsSync(dir));
if (fs.existsSync(dir)) console.log('Contents:', fs.readdirSync(dir));

// Navigate
const raw2 = execSync(CLI + ' page navigate https://www.saucedemo.com --session ' + session.data.id, opts);
console.log('Navigate output:', extractJson(raw2));

// Check disk after navigate
console.log('Dir exists after nav:', fs.existsSync(dir));
if (fs.existsSync(dir)) console.log('Contents after nav:', fs.readdirSync(dir));

// Try fill
try {
    const raw3 = execSync(CLI + ' page fill "#user-name" "test_user" --session ' + session.data.id, opts);
    console.log('Fill SUCCESS:', extractJson(raw3));
} catch (e) {
    console.log('Fill FAILED:', e.stdout ? e.stdout.trim().slice(-200) : e.message.slice(0, 200));
}

// Release
execSync(CLI + ' session release ' + session.data.id, opts);
console.log('Done');
