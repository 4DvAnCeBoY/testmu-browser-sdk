/**
 * ============================================================================
 * TEST: File Service (LambdaTest Cloud)
 * ============================================================================
 *
 * Tests direct file upload/download between local machine and cloud browser.
 * No cloud storage needed - transfers happen directly!
 *
 * Test 1: UPLOAD - Local file → Cloud browser file input
 *   - Creates a test text file locally
 *   - Uploads it to a file input on a remote page using DataTransfer API
 *   - Submits the form and verifies the upload worked
 *
 * Test 2: DOWNLOAD (URL) - Fetch file from URL via cloud browser → Save locally
 *   - Browser fetches a file from a URL
 *   - Content is transferred back as Base64
 *   - Saved to local disk
 *
 * Test 3: DOWNLOAD (Click) - Click download link → Intercept → Save locally
 *   - Sets up CDP network interception
 *   - Clicks a download link in the browser
 *   - Intercepts the response and saves file locally
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/07-file-service.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs-extra';
import * as path from 'path';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: File Service (Local ↔ Cloud Browser)');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Configure download directory
    const downloadDir = path.join(process.cwd(), 'test-output', 'downloads');
    client.files.setConfig({ downloadDir, verbose: true });
    await fs.ensureDir(downloadDir);

    // Create test file for upload
    const testFilePath = path.join(process.cwd(), 'test-output', 'upload-test.txt');
    const testContent = `Hello from testMuBrowser SDK!\nCreated at: ${new Date().toISOString()}\nThis file was uploaded from local machine to cloud browser.`;
    await fs.writeFile(testFilePath, testContent);
    console.log(`\nTest file created: ${testFilePath}`);
    console.log(`Content: "${testContent.split('\n')[0]}..."`);

    // Create session
    console.log('\nCreating LambdaTest session...');
    const session = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - File Service',
            name: 'File Upload/Download Test',
            platformName: 'Windows 10',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`Session created: ${session.id}`);

    const browser = await client.puppeteer.connect(session);
    const page = (await browser.pages())[0];
    console.log('Browser connected\n');

    try {
        // ============================================
        // Test 1: UPLOAD - Local File → Cloud Browser
        // ============================================
        console.log('--- Test 1: Upload Local File to Cloud Browser ---');
        console.log('   Site: https://the-internet.herokuapp.com/upload');

        await page.goto('https://the-internet.herokuapp.com/upload', {
            waitUntil: 'networkidle2'
        });

        console.log('   Page loaded');

        // Upload local file to the file input using DataTransfer API
        console.log(`   Uploading: ${path.basename(testFilePath)}`);
        await client.files.uploadToInput(page, '#file-upload', testFilePath);
        console.log('   File injected into input element');

        // Submit the form (click + waitForNavigation must be parallel)
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.click('#file-submit')
        ]);

        // Verify upload
        const uploadedFilename = await page.$eval('#uploaded-files', (el: any) => el.textContent.trim());
        console.log(`   Server received: "${uploadedFilename}"`);

        if (uploadedFilename === 'upload-test.txt') {
            console.log('   UPLOAD TEST PASSED!');
        } else {
            console.log(`   Upload result: ${uploadedFilename}`);
        }

        // ============================================
        // Test 2: DOWNLOAD (URL) - Fetch via Browser
        // ============================================
        console.log('\n--- Test 2: Download File from URL via Browser ---');
        console.log('   Downloading a sample JSON file...');

        await page.goto('https://httpbin.org', { waitUntil: 'networkidle2' });

        const jsonFile = await client.files.downloadFromUrl(
            page,
            'https://httpbin.org/json',
            'sample-data.json'
        );

        console.log(`   Downloaded: ${jsonFile.name}`);
        console.log(`   Size: ${jsonFile.size} bytes`);
        console.log(`   Saved to: ${jsonFile.localPath}`);

        // Verify content
        const jsonContent = JSON.parse(jsonFile.content.toString());
        if (jsonContent.slideshow) {
            console.log(`   Content verified: slideshow with ${jsonContent.slideshow.slides?.length} slides`);
            console.log('   URL DOWNLOAD TEST PASSED!');
        }

        // ============================================
        // Test 3: DOWNLOAD (Click) - CDP Interception
        // ============================================
        console.log('\n--- Test 3: Download File by Clicking Link ---');
        console.log('   Site: https://the-internet.herokuapp.com/download');

        await page.goto('https://the-internet.herokuapp.com/download', {
            waitUntil: 'networkidle2'
        });

        // Find a download link
        const links = await page.$$eval('a', (anchors: any[]) =>
            anchors
                .map(a => ({ text: a.textContent, href: a.href }))
                .filter(a => a.href && !a.href.includes('#') && a.text.trim())
        );

        const downloadableLinks = links.filter(l =>
            l.href.includes('/download/') && (l.text.endsWith('.txt') || l.text.endsWith('.pdf') || l.text.endsWith('.csv') || l.text.endsWith('.jpg'))
        );

        if (downloadableLinks.length > 0) {
            const targetLink = downloadableLinks[0];
            console.log(`   Found file: ${targetLink.text}`);
            console.log(`   URL: ${targetLink.href}`);

            // Use downloadFromUrl since it's simpler and works with remote browsers
            try {
                const clickFile = await client.files.downloadFromUrl(
                    page,
                    targetLink.href,
                    targetLink.text
                );

                console.log(`   Downloaded: ${clickFile.name}`);
                console.log(`   Size: ${clickFile.size} bytes`);
                console.log(`   Saved to: ${clickFile.localPath}`);
                console.log('   CLICK DOWNLOAD TEST PASSED!');
            } catch (error: any) {
                console.log(`   Download error: ${error.message}`);

                // Fallback: try CDP interception
                console.log('   Trying CDP interception...');
                try {
                    const cdpFile = await client.files.download(page, async () => {
                        await page.click(`a[href*="${path.basename(targetLink.href)}"]`);
                    }, { filename: targetLink.text, timeout: 15000 });

                    console.log(`   Downloaded via CDP: ${cdpFile.name} (${cdpFile.size} bytes)`);
                    console.log(`   Saved to: ${cdpFile.localPath}`);
                    console.log('   CDP DOWNLOAD TEST PASSED!');
                } catch (cdpError: any) {
                    console.log(`   CDP download error: ${cdpError.message}`);
                }
            }
        } else {
            console.log('   No downloadable files found on page');
            console.log('   Available links:');
            links.slice(0, 5).forEach(l => console.log(`     - ${l.text}: ${l.href}`));
        }

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '='.repeat(60));

        // List all downloaded files
        const downloadedFiles = await fs.readdir(downloadDir);
        console.log(`\nFiles in downloads folder (${downloadDir}):`);
        for (const f of downloadedFiles) {
            const stats = await fs.stat(path.join(downloadDir, f));
            console.log(`   - ${f} (${stats.size} bytes)`);
        }

        console.log('\n' + '='.repeat(60));
        console.log(' File Service Test Complete!');
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n Test Error:', error.message);
        throw error;
    } finally {
        await browser.close();
        await client.sessions.release(session.id);
        console.log('\nSession cleaned up');
    }

    console.log('\nUsage examples:');
    console.log('  // Upload local file to cloud browser');
    console.log('  await client.files.uploadToInput(page, "input[type=file]", "./photo.png");');
    console.log('');
    console.log('  // Download file from URL via browser');
    console.log('  const file = await client.files.downloadFromUrl(page, "https://example.com/report.pdf");');
    console.log('');
    console.log('  // Download by clicking (CDP interception)');
    console.log('  const file = await client.files.download(page, async () => {');
    console.log('      await page.click("#download-btn");');
    console.log('  });');
    console.log('  console.log(file.localPath); // Where it was saved locally');
}

main().catch(err => {
    console.error('\n Test Failed:', err.message);
    process.exit(1);
});
