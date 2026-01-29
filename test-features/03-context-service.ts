/**
 * ============================================================================
 * TEST: Context Service - Cookie Transfer Across Sessions (Real Example)
 * ============================================================================
 *
 * PRACTICAL EXAMPLE:
 * ------------------
 * Session 1: Visit httpbin.org → Set cookies via its API → Page shows cookies
 *            → Extract context with SDK
 *
 * Session 2: Fresh browser → Visit httpbin.org/cookies → Page shows NO cookies
 *            (Proving it's a clean session)
 *
 * Session 3: Fresh browser → Inject saved context → Visit httpbin.org/cookies
 *            → Page shows the SAME cookies from Session 1!
 *            (Proving context transfer works)
 *
 * httpbin.org/cookies is a real endpoint that reflects back all cookies
 * the browser sends - perfect for verifying cookie state visually.
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/03-context-service.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function createSession(client: any, name: string) {
    return client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Context Service',
            name,
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
}

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Context Service - Cookie Transfer (Real Example)');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    let savedContext: any = null;

    try {
        // ============================================
        // SESSION 1: Set cookies via httpbin, extract context
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('SESSION 1: Set cookies and save context');
        console.log('='.repeat(60));

        const session1 = await createSession(client, 'S1 - Set Cookies');
        console.log(`\nSession 1: ${session1.id}`);

        const browser1 = await client.puppeteer.connect(session1);
        const page1 = (await browser1.pages())[0];

        // Step 1: Set cookies using httpbin's cookie-setting endpoint
        console.log('\n1. Setting cookies via httpbin.org...');
        await page1.goto('https://httpbin.org/cookies/set?session_theme=dark&user_lang=en&consent_given=true&user_tier=premium', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await new Promise(r => setTimeout(r, 2000));

        // Step 2: Verify cookies are set by visiting /cookies
        console.log('2. Verifying cookies on httpbin.org/cookies...');
        await page1.goto('https://httpbin.org/cookies', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await new Promise(r => setTimeout(r, 2000));

        // Read what the page shows
        const pageContent1 = await page1.evaluate(() => document.body.innerText);
        console.log('   Page shows:');
        console.log('   ' + pageContent1.replace(/\n/g, '\n   '));

        // Get cookies via SDK
        const cookies1 = await client.context.getCookies(page1);
        console.log(`\n3. SDK extracted ${cookies1.length} cookies:`);
        cookies1.forEach((c: any) => console.log(`     - ${c.name} = ${c.value}`));

        // Extract full context
        console.log('\n4. Extracting full context...');
        savedContext = await client.context.getContext(page1);
        console.log(`   Saved: ${savedContext.cookies.length} cookies`);

        // Screenshot
        await page1.screenshot({ path: 'test-output/context-s1-cookies-set.png' });
        console.log('   Screenshot: test-output/context-s1-cookies-set.png');

        await browser1.close();
        await client.sessions.release(session1.id);
        console.log('\nSession 1 closed');

        // ============================================
        // SESSION 2: Fresh browser - should have NO cookies
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('SESSION 2: Fresh browser (NO context) - Should have NO cookies');
        console.log('='.repeat(60));

        const session2 = await createSession(client, 'S2 - Fresh (No Context)');
        console.log(`\nSession 2: ${session2.id}`);

        const browser2 = await client.puppeteer.connect(session2);
        const page2 = (await browser2.pages())[0];

        console.log('\n1. Navigating to httpbin.org/cookies (fresh browser)...');
        await page2.goto('https://httpbin.org/cookies', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await new Promise(r => setTimeout(r, 2000));

        const pageContent2 = await page2.evaluate(() => document.body.innerText);
        console.log('2. Page shows:');
        console.log('   ' + pageContent2.replace(/\n/g, '\n   '));

        const cookies2 = await client.context.getCookies(page2);
        console.log(`   SDK found ${cookies2.length} cookies (should be 0)`);

        await page2.screenshot({ path: 'test-output/context-s2-fresh.png' });
        console.log('   Screenshot: test-output/context-s2-fresh.png');

        await browser2.close();
        await client.sessions.release(session2.id);
        console.log('\nSession 2 closed');

        // ============================================
        // SESSION 3: Fresh browser + inject context - cookies should appear!
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('SESSION 3: Fresh browser + INJECTED context - Cookies should APPEAR');
        console.log('='.repeat(60));

        const session3 = await createSession(client, 'S3 - With Injected Context');
        console.log(`\nSession 3: ${session3.id}`);

        const browser3 = await client.puppeteer.connect(session3);
        const page3 = (await browser3.pages())[0];

        // Inject saved context BEFORE navigating
        console.log('\n1. Injecting saved context (cookies)...');
        await client.context.setCookies(page3, savedContext.cookies);
        console.log(`   Injected ${savedContext.cookies.length} cookies`);

        console.log('2. Navigating to httpbin.org/cookies...');
        await page3.goto('https://httpbin.org/cookies', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await new Promise(r => setTimeout(r, 2000));

        const pageContent3 = await page3.evaluate(() => document.body.innerText);
        console.log('3. Page shows:');
        console.log('   ' + pageContent3.replace(/\n/g, '\n   '));

        const cookies3 = await client.context.getCookies(page3);
        console.log(`   SDK found ${cookies3.length} cookies`);

        await page3.screenshot({ path: 'test-output/context-s3-injected.png' });
        console.log('   Screenshot: test-output/context-s3-injected.png');

        await browser3.close();
        await client.sessions.release(session3.id);
        console.log('\nSession 3 closed');

        // ============================================
        // VALIDATION
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('RESULTS');
        console.log('='.repeat(60));

        // Parse cookie counts from page content
        const s1HasCookies = pageContent1.includes('session_theme');
        const s2HasCookies = pageContent2.includes('session_theme');
        const s3HasCookies = pageContent3.includes('session_theme');

        console.log(`\n   Session 1 (Set cookies):    Cookies visible: ${s1HasCookies ? 'YES' : 'NO'}`);
        console.log(`   Session 2 (Fresh browser):  Cookies visible: ${s2HasCookies ? 'YES (unexpected)' : 'NO (clean state confirmed)'}`);
        console.log(`   Session 3 (With context):   Cookies visible: ${s3HasCookies ? 'YES (context transfer worked!)' : 'NO (transfer may have failed)'}`);

        console.log('\n   Compare screenshots:');
        console.log('     test-output/context-s1-cookies-set.png  (cookies shown)');
        console.log('     test-output/context-s2-fresh.png         (empty - no cookies)');
        console.log('     test-output/context-s3-injected.png      (cookies shown = SUCCESS)');

        if (s1HasCookies && !s2HasCookies && s3HasCookies) {
            console.log('\n' + '='.repeat(60));
            console.log('CONTEXT TRANSFER WORKED!');
            console.log('Cookies were preserved across sessions via the SDK.');
            console.log('='.repeat(60));
        } else if (s1HasCookies && !s2HasCookies && !s3HasCookies) {
            console.log('\n Context injection did not carry over. Check cookie domains.');
        }

    } catch (error: any) {
        console.error('\n Test Error:', error.message);
        throw error;
    } finally {
        await client.sessions.releaseAll();
    }

    console.log('\nReal-world usage:');
    console.log('  // Login once, save state');
    console.log('  const ctx = await client.context.getContext(page);');
    console.log('');
    console.log('  // Every future session - skip login!');
    console.log('  await client.context.setCookies(newPage, ctx.cookies);');
    console.log('  await page.goto("https://app.example.com"); // Already logged in!');
}

main().catch(err => {
    console.error('\n Test Failed:', err.message);
    process.exit(1);
});
