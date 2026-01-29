/**
 * ============================================================================
 * TEST: Profile Service (LambdaTest Cloud) - Clear Validation
 * ============================================================================
 *
 * This test clearly demonstrates profile save/load by:
 * 1. Session 1: Set specific cookies & localStorage values
 * 2. Save profile to local file
 * 3. Session 2: Fresh browser, load profile
 * 4. Navigate to httpbin.org/cookies - it SHOWS the cookies sent
 * 5. Visual proof that cookies were restored!
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/05-profile-service.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as fs from 'fs-extra';
import * as path from 'path';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Profile Service - Clear Validation');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    // Use test-output/profiles directory
    const profilesDir = path.join(process.cwd(), 'test-output', 'profiles');
    client.profiles.setConfig({ profilesDir, verbose: true });

    // Clean up
    await fs.ensureDir(profilesDir);
    await fs.emptyDir(profilesDir);

    const TEST_PROFILE_ID = 'test-validation-profile';

    // Unique values to prove transfer worked
    const TEST_COOKIE_VALUE = `sdk_test_${Date.now()}`;
    const TEST_STORAGE_VALUE = `storage_value_${Date.now()}`;

    console.log('\n📋 Test Values (unique per run):');
    console.log(`   Cookie value: ${TEST_COOKIE_VALUE}`);
    console.log(`   Storage value: ${TEST_STORAGE_VALUE}`);

    try {
        // ============================================
        // SESSION 1: Set values and save profile
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('SESSION 1: Create profile with test values');
        console.log('='.repeat(60));

        const session1 = await client.sessions.create({
            adapter: 'puppeteer',
            lambdatestOptions: {
                build: 'SDK Tests - Profile Service',
                name: 'Session 1 - Save Profile',
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

        console.log(`\n✅ Session 1 created: ${session1.id}`);

        const browser1 = await client.puppeteer.connect(session1);
        const page1 = (await browser1.pages())[0];

        // Navigate to httpbin (a test site)
        console.log('\n1️⃣  Navigating to httpbin.org...');
        await page1.goto('https://httpbin.org', { waitUntil: 'networkidle2' });

        // Set a custom cookie
        console.log('2️⃣  Setting test cookie...');
        await page1.setCookie({
            name: 'sdk_test_cookie',
            value: TEST_COOKIE_VALUE,
            domain: 'httpbin.org',
            path: '/'
        });

        // Set localStorage
        console.log('3️⃣  Setting localStorage...');
        await page1.evaluate((value) => {
            localStorage.setItem('sdk_test_key', value);
        }, TEST_STORAGE_VALUE);

        // Verify values are set in session 1
        const cookies1 = await page1.cookies();
        const testCookie1 = cookies1.find(c => c.name === 'sdk_test_cookie');
        const storage1 = await page1.evaluate(() => localStorage.getItem('sdk_test_key'));

        console.log('\n📊 Session 1 State:');
        console.log(`   Cookie 'sdk_test_cookie': ${testCookie1?.value || 'NOT FOUND'}`);
        console.log(`   localStorage 'sdk_test_key': ${storage1 || 'NOT FOUND'}`);

        // Save profile
        console.log('\n4️⃣  Saving profile to local file...');
        const savedProfile = await client.profiles.saveProfile(TEST_PROFILE_ID, page1, {
            name: 'Validation Test Profile',
            description: 'Testing cookie and localStorage persistence'
        });

        console.log(`\n✅ Profile saved: ${savedProfile.id}`);
        console.log(`   File: ${profilesDir}/${TEST_PROFILE_ID}.json`);
        console.log(`   Cookies saved: ${savedProfile.cookies.length}`);
        console.log(`   localStorage keys: ${Object.keys(savedProfile.localStorage).length}`);

        // Show the saved file content
        const savedFile = await fs.readJson(path.join(profilesDir, `${TEST_PROFILE_ID}.json`));
        console.log('\n📄 Saved Profile Content:');
        console.log(`   Cookie value in file: ${savedFile.cookies.find((c: any) => c.name === 'sdk_test_cookie')?.value}`);
        console.log(`   localStorage in file: ${savedFile.localStorage['sdk_test_key']}`);

        // Close session 1
        await browser1.close();
        await client.sessions.release(session1.id);
        console.log('\n✅ Session 1 closed');

        // ============================================
        // SESSION 2: Fresh browser, load profile
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('SESSION 2: Fresh browser, load saved profile');
        console.log('='.repeat(60));

        const session2 = await client.sessions.create({
            adapter: 'puppeteer',
            lambdatestOptions: {
                build: 'SDK Tests - Profile Service',
                name: 'Session 2 - Load Profile',
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

        console.log(`\n✅ Session 2 created: ${session2.id}`);
        console.log('   (This is a FRESH browser with NO cookies or localStorage)');

        const browser2 = await client.puppeteer.connect(session2);
        const page2 = (await browser2.pages())[0];

        // First, verify it's a clean browser
        console.log('\n1️⃣  Navigating to httpbin.org (fresh browser)...');
        await page2.goto('https://httpbin.org', { waitUntil: 'networkidle2' });

        const cookiesBefore = await page2.cookies();
        const storageBefore = await page2.evaluate(() => localStorage.getItem('sdk_test_key'));

        console.log('\n📊 Session 2 State BEFORE loading profile:');
        console.log(`   Cookies: ${cookiesBefore.length} (should be 0 or minimal)`);
        console.log(`   sdk_test_cookie: ${cookiesBefore.find(c => c.name === 'sdk_test_cookie')?.value || 'NOT FOUND ✓'}`);
        console.log(`   localStorage 'sdk_test_key': ${storageBefore || 'NOT FOUND ✓'}`);

        // Load the saved profile
        console.log('\n2️⃣  Loading profile from local file...');
        const loaded = await client.profiles.loadProfile(TEST_PROFILE_ID, page2);
        console.log(`   Profile loaded: ${loaded ? 'Yes ✓' : 'No ✗'}`);

        // Verify values after loading
        const cookiesAfter = await page2.cookies();
        const testCookie2 = cookiesAfter.find(c => c.name === 'sdk_test_cookie');
        const storageAfter = await page2.evaluate(() => localStorage.getItem('sdk_test_key'));

        console.log('\n📊 Session 2 State AFTER loading profile:');
        console.log(`   Cookie 'sdk_test_cookie': ${testCookie2?.value || 'NOT FOUND'}`);
        console.log(`   localStorage 'sdk_test_key': ${storageAfter || 'NOT FOUND'}`);

        // ============================================
        // VALIDATION
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION');
        console.log('='.repeat(60));

        const cookieMatch = testCookie2?.value === TEST_COOKIE_VALUE;
        const storageMatch = storageAfter === TEST_STORAGE_VALUE;

        console.log(`\n🔍 Cookie Transfer: ${cookieMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Expected: ${TEST_COOKIE_VALUE}`);
        console.log(`   Got:      ${testCookie2?.value || 'undefined'}`);

        console.log(`\n🔍 localStorage Transfer: ${storageMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Expected: ${TEST_STORAGE_VALUE}`);
        console.log(`   Got:      ${storageAfter || 'undefined'}`);

        // Visual proof: Navigate to httpbin cookies endpoint
        console.log('\n3️⃣  Visual Proof - Checking httpbin.org/cookies...');
        await page2.goto('https://httpbin.org/cookies', { waitUntil: 'networkidle2' });

        const pageContent = await page2.evaluate(() => document.body.innerText);
        console.log('\n📄 httpbin.org/cookies response (shows cookies sent to server):');
        console.log(pageContent);

        // Take screenshot as proof
        const screenshotPath = path.join(process.cwd(), 'test-output', 'profile-cookies-proof.png');
        await page2.screenshot({ path: screenshotPath });
        console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

        // Close session 2
        await browser2.close();
        await client.sessions.release(session2.id);
        console.log('\n✅ Session 2 closed');

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '='.repeat(60));
        if (cookieMatch && storageMatch) {
            console.log('✅ ALL TESTS PASSED - Profile save/load works correctly!');
        } else {
            console.log('❌ SOME TESTS FAILED');
        }
        console.log('='.repeat(60));

        console.log(`\n📁 Profile saved at: ${profilesDir}/${TEST_PROFILE_ID}.json`);
        console.log(`📸 Screenshot proof: ${screenshotPath}`);

    } catch (error: any) {
        console.error('\n❌ Test Error:', error.message);
        throw error;
    } finally {
        await client.sessions.releaseAll();
    }
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
