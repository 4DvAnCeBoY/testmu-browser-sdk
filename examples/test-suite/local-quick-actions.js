#!/usr/bin/env node
// LOCAL TEST SUITE: Quick actions that run on local Chrome (no cloud credentials needed)
// Tests scrape, screenshot, and PDF with real-world sites

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLI = path.join(__dirname, '../../dist/cli/index.js');
const results = [];
let passed = 0;
let failed = 0;

function run(name, cmd) {
  try {
    const output = execSync(`node ${CLI} ${cmd}`, { timeout: 60000, encoding: 'utf-8' });
    const json = JSON.parse(output.trim());
    if (json.success) {
      passed++;
      results.push({ name, status: 'PASS' });
      console.log(`  ✓ ${name}`);
      return json;
    } else {
      failed++;
      results.push({ name, status: 'FAIL', error: json.error });
      console.log(`  ✗ ${name}: ${json.error}`);
      return null;
    }
  } catch (err) {
    failed++;
    const msg = err.message.substring(0, 100);
    results.push({ name, status: 'FAIL', error: msg });
    console.log(`  ✗ ${name}: ${msg}`);
    return null;
  }
}

console.log('\n=== LOCAL QUICK ACTIONS TEST SUITE ===\n');

// 1-5: Scrape different content types
console.log('--- Scraping Tests ---');
run('1. Scrape tech news (HN)', 'scrape https://news.ycombinator.com --format text');
run('2. Scrape API docs (Playwright)', 'scrape https://playwright.dev/docs/api/class-page --format markdown');
run('3. Scrape product page (npm)', 'scrape https://www.npmjs.com/package/playwright --format text');
run('4. Scrape Wikipedia article', 'scrape https://en.wikipedia.org/wiki/Web_scraping --format readability');
run('5. Scrape Stack Overflow Q&A', 'scrape https://stackoverflow.com/questions/tagged/playwright --format text');

// 6-10: Scrape data-heavy pages
console.log('\n--- Data Extraction Tests ---');
run('6. Scrape GitHub trending', 'scrape https://github.com/trending --format text');
run('7. Scrape dev.to articles', 'scrape https://dev.to --format markdown');
run('8. Scrape MDN docs', 'scrape https://developer.mozilla.org/en-US/docs/Web/JavaScript --format text');
run('9. Scrape pricing page', 'scrape https://www.lambdatest.com/pricing --format text');
run('10. Scrape job board', 'scrape https://www.ycombinator.com/companies --format text');

// 11-15: Screenshot tests
console.log('\n--- Screenshot Tests ---');
run('11. Screenshot landing page', 'screenshot https://www.testmuai.com --output /tmp/test-11.png');
run('12. Screenshot GitHub repo', 'screenshot https://github.com/4DvAnCeBoY/testmu-browser-sdk --output /tmp/test-12.png');
run('13. Screenshot docs page', 'screenshot https://playwright.dev --output /tmp/test-13.png');
run('14. Screenshot full page blog', 'screenshot https://dev.to --full-page --output /tmp/test-14.png');
run('15. Screenshot as JPEG', 'screenshot https://news.ycombinator.com --format jpeg --output /tmp/test-15.jpg');

// 16-20: PDF generation tests
console.log('\n--- PDF Tests ---');
run('16. PDF of wiki article', 'pdf https://en.wikipedia.org/wiki/Selenium_(software) --output /tmp/test-16.pdf');
run('17. PDF of documentation', 'pdf https://playwright.dev/docs/intro --output /tmp/test-17.pdf');
run('18. PDF landscape mode', 'pdf https://github.com/trending --format Letter --output /tmp/test-18.pdf');
run('19. PDF of news page', 'pdf https://news.ycombinator.com --output /tmp/test-19.pdf');
run('20. PDF A4 format', 'pdf https://www.lambdatest.com/pricing --format A4 --output /tmp/test-20.pdf');

// 21-25: Edge cases and formats
console.log('\n--- Edge Cases ---');
const r21 = run('21. Scrape HTML format', 'scrape https://httpbin.org/html --format html');
run('22. Screenshot webp format', 'screenshot https://httpbin.org --format webp --output /tmp/test-22.webp');
run('23. Scrape with wait-for', 'scrape https://news.ycombinator.com --format text --wait-for .titleline');
run('24. Screenshot without full-page', 'screenshot https://www.google.com --output /tmp/test-24.png');
run('25. Scrape JSON API page', 'scrape https://httpbin.org/json --format text');

// Verify files exist
console.log('\n--- File Verification ---');
const expectedFiles = [
  '/tmp/test-11.png', '/tmp/test-12.png', '/tmp/test-13.png', '/tmp/test-14.png',
  '/tmp/test-15.jpg', '/tmp/test-16.pdf', '/tmp/test-17.pdf', '/tmp/test-18.pdf',
  '/tmp/test-19.pdf', '/tmp/test-20.pdf', '/tmp/test-22.webp', '/tmp/test-24.png'
];

let filesOk = 0;
for (const f of expectedFiles) {
  if (fs.existsSync(f)) {
    const size = fs.statSync(f).size;
    if (size > 0) { filesOk++; } else { console.log(`  ✗ ${f} is empty`); }
  } else {
    console.log(`  ✗ ${f} missing`);
  }
}
console.log(`  ✓ ${filesOk}/${expectedFiles.length} output files verified`);

// Cleanup
for (const f of expectedFiles) { try { fs.unlinkSync(f); } catch(e) {} }

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of 25 ===\n`);
console.log(JSON.stringify({ total: 25, passed, failed, results }, null, 2));
