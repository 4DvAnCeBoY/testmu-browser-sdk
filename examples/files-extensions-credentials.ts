/**
 * Files, Extensions & Credentials - Real Website Automation
 * 
 * Demonstrates file management, extension management, and credential storage
 * with real website automation on LambdaTest cloud.
 * 
 * Real Websites Used:
 * - https://the-internet.herokuapp.com/upload (File upload)
 * - https://the-internet.herokuapp.com/download (File download)
 * - https://the-internet.herokuapp.com/basic_auth (Credentials)
 * 
 * Prerequisites:
 *   export LT_USERNAME=your_username
 *   export LT_ACCESS_KEY=your_access_key
 * 
 * To run:
 *   npx ts-node examples/files-extensions-credentials.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs';
import * as path from 'path';

const LT_USERNAME = process.env.LT_USERNAME || 'your_username';
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY || 'your_access_key';

async function main() {
    console.log("📁 Files, Extensions & Credentials - Real Websites\n");
    console.log("═".repeat(60));

    const client = new testMuBrowser();

    // ========================================
    // Part 1: File Upload Testing
    // ========================================
    console.log("\n📤 Part 1: File Upload Testing");
    console.log("─".repeat(50));

    const session1 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Files & Credentials Demo',
            name: 'File Upload Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    console.log(`   Session ID: ${session1.id}`);
    const browser1 = await client.puppeteer.connect(session1);
    const page1 = (await browser1.pages())[0];

    // Navigate to Heroku file upload page
    console.log("\n🌐 Navigating to Heroku File Upload page...");
    await page1.goto('https://the-internet.herokuapp.com/upload', { waitUntil: 'networkidle2' });
    console.log("   ✓ File upload page loaded");

    // Create a test file using our File Service
    console.log("\n📄 Creating test file via File Service...");
    const testContent = Buffer.from(`
Test file created by testMuBrowser
Timestamp: ${new Date().toISOString()}
Session: ${session1.id}
Purpose: Demonstrating file management capabilities
    `.trim());

    const uploadedFile = await client.files.upload(testContent, 'demo/test-upload.txt');
    console.log(`   ✓ Created: ${uploadedFile.path}`);
    console.log(`   Size: ${uploadedFile.size} bytes`);

    // Upload file to session storage
    console.log("\n📁 Uploading to session storage...");
    const sessionFile = await client.sessions.files.upload(
        session1.id,
        testContent,
        'session-test-file.txt'
    );
    console.log(`   ✓ Session file: ${sessionFile.path}`);

    // List session files
    const sessionFiles = await client.sessions.files.list(session1.id);
    console.log(`   Session files count: ${sessionFiles.length}`);

    // Take screenshot of upload page
    await client.sessions.computer(session1.id, page1, { action: 'screenshot' });

    await browser1.close();
    await client.sessions.release(session1.id);

    // ========================================
    // Part 2: File Download Testing
    // ========================================
    console.log("\n\n📥 Part 2: File Download Testing");
    console.log("─".repeat(50));

    const session2 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Files & Credentials Demo',
            name: 'File Download Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    const browser2 = await client.puppeteer.connect(session2);
    const page2 = (await browser2.pages())[0];

    // Navigate to download page
    console.log("\n🌐 Navigating to Heroku Download page...");
    await page2.goto('https://the-internet.herokuapp.com/download', { waitUntil: 'networkidle2' });
    console.log("   ✓ Download page loaded");

    // List available downloads
    const downloadLinks = await page2.$$eval('a[href*="download"]', links =>
        links.map(l => l.textContent).slice(0, 5)
    );
    console.log(`\n   Available downloads: ${downloadLinks.length}`);
    downloadLinks.forEach(name => console.log(`     - ${name}`));

    // Download from our file service
    console.log("\n📥 Downloading from File Service...");
    const downloadedContent = await client.files.download('demo/test-upload.txt');
    console.log(`   ✓ Downloaded: ${downloadedContent.length} bytes`);
    console.log(`   Content preview: "${downloadedContent.toString().substring(0, 50)}..."`);

    // List all stored files
    const allFiles = await client.files.list();
    console.log(`\n📋 All stored files: ${allFiles.length}`);
    allFiles.forEach(f => console.log(`     - ${f.path} (${f.size} bytes)`));

    await browser2.close();
    await client.sessions.release(session2.id);

    // ========================================
    // Part 3: Extension Management
    // ========================================
    console.log("\n\n🧩 Part 3: Extension Management");
    console.log("─".repeat(50));

    // List existing extensions
    console.log("\n📋 Listing extensions...");
    const extensions = await client.extensions.list();
    console.log(`   Found ${extensions.length} extension(s)`);

    // Create a mock extension manifest
    console.log("\n📤 Creating mock extension...");
    const mockManifest = Buffer.from(JSON.stringify({
        manifest_version: 3,
        name: "LambdaTest Helper Extension",
        version: "1.0.0",
        description: "Demo extension for testMuBrowser"
    }, null, 2));

    try {
        const uploadedExt = await client.extensions.upload(mockManifest, 'lambdatest-helper.crx');
        console.log(`   ✓ Extension ID: ${uploadedExt.id}`);
        console.log(`   Name: ${uploadedExt.name}`);

        // Update extension
        const updatedExt = await client.extensions.update(uploadedExt.id, {
            enabled: true
        });
        console.log(`   ✓ Updated: enabled=${updatedExt.enabled}`);

        // Get enabled extension paths
        const extPaths = await client.extensions.getEnabledExtensionPaths();
        console.log(`\n   Enabled extension paths: ${extPaths.length}`);

        // Delete extension
        await client.extensions.delete(uploadedExt.id);
        console.log(`   ✓ Extension deleted`);

    } catch (e) {
        console.log(`   Extension ops: ${e}`);
    }

    // ========================================
    // Part 4: Credential Management & Auth Testing
    // ========================================
    console.log("\n\n🔑 Part 4: Credential Management & Auth Testing");
    console.log("─".repeat(50));

    // Create credentials for Heroku basic auth
    console.log("\n➕ Creating credentials...");
    const cred1 = await client.credentials.create({
        url: 'https://the-internet.herokuapp.com/basic_auth',
        username: 'admin',
        password: 'admin'
    });
    console.log(`   ✓ Credential ID: ${cred1.id}`);
    console.log(`   URL: ${cred1.url}`);
    console.log(`   Username: ${cred1.username}`);

    // Create additional test credentials
    const cred2 = await client.credentials.create({
        url: 'https://www.saucedemo.com',
        username: 'standard_user',
        password: 'secret_sauce'
    });
    console.log(`\n   ✓ Created SauceDemo credential: ${cred2.id}`);

    // List all credentials
    const allCreds = await client.credentials.list();
    console.log(`\n📋 All credentials: ${allCreds.length}`);
    allCreds.forEach(c => console.log(`     - ${c.url}: ${c.username}`));

    // Find credentials for a URL
    console.log("\n🔍 Finding credentials by URL...");
    const foundCred = await client.credentials.findForUrl('https://the-internet.herokuapp.com');
    if (foundCred) {
        console.log(`   ✓ Found: ${foundCred.username} for ${foundCred.url}`);
    }

    // Test basic auth with stored credentials
    console.log("\n🔐 Testing Basic Auth on Heroku...");

    const session3 = await client.sessions.create({
        lambdatestOptions: {
            build: 'Files & Credentials Demo',
            name: 'Basic Auth Test',
            platformName: 'Windows 11',
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
                username: LT_USERNAME,
                accessKey: LT_ACCESS_KEY,
                video: true
            }
        }
    });

    const browser3 = await client.puppeteer.connect(session3);
    const page3 = (await browser3.pages())[0];

    // Use stored credentials for basic auth
    if (foundCred) {
        // Set basic auth credentials in URL
        const authUrl = `https://${foundCred.username}:${foundCred.password}@the-internet.herokuapp.com/basic_auth`;
        await page3.goto(authUrl, { waitUntil: 'networkidle2' });

        // Check for success message
        const successMessage = await page3.$('.example p');
        if (successMessage) {
            const text = await page3.evaluate(el => el?.textContent, successMessage);
            console.log(`   ✓ Auth result: ${text?.trim()}`);
        }
    }

    await browser3.close();
    await client.sessions.release(session3.id);

    // ========================================
    // Cleanup
    // ========================================
    console.log("\n\n🧹 Cleanup");
    console.log("─".repeat(50));

    // Delete test credentials
    await client.credentials.delete(cred1.id);
    await client.credentials.delete(cred2.id);
    console.log("   ✓ Deleted test credentials");

    // Delete test files
    await client.files.delete('demo/test-upload.txt');
    console.log("   ✓ Deleted test files");

    console.log("\n" + "═".repeat(60));
    console.log("✅ Files, Extensions & Credentials Demo Complete!");
    console.log("   View recordings at: https://automation.lambdatest.com/");
}

main().catch(console.error);
