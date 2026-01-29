/**
 * ============================================================================
 * TEST: Extension Service (LambdaTest Cloud)
 * ============================================================================
 *
 * Tests loading Chrome extensions into LambdaTest cloud sessions
 * using pre-uploaded S3 URLs.
 *
 * Test 1: Direct URL in capabilities (lambda:loadExtension)
 * Test 2: Via SDK registerCloudExtension() + extensionIds
 *
 * Prerequisites:
 *   Upload extension ZIP to LambdaTest via:
 *   curl --location 'https://api.lambdatest.com/automation/api/v1/files/extensions' \
 *     --header 'Authorization: Basic <key>' \
 *     --form 'extensions=@"/path/to/extension.zip"'
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/06-extension-service.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

// Pre-uploaded extension URL from LambdaTest cloud
const EXTENSION_URL = 'https://prod-magicleap-user-files-us-east-1-v1.s3.amazonaws.com/extensions/orgId-2400763/test-extension.zip';

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Extension Service (LambdaTest Cloud)');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();

    try {
        // ============================================
        // Test 1: Direct S3 URL in capabilities
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: Load extension via direct S3 URL');
        console.log('='.repeat(60));
        console.log(`\n   Extension: ${EXTENSION_URL}`);

        console.log('\n1. Creating session with lambda:loadExtension...');
        const session1 = await client.sessions.create({
            adapter: 'puppeteer',
            lambdatestOptions: {
                build: 'SDK Tests - Extension Service',
                name: 'T1 - Direct URL',
                platformName: 'Windows 10',
                browserName: 'Chrome',
                browserVersion: 'latest',
                'LT:Options': {
                    username: LT_USERNAME,
                    accessKey: LT_ACCESS_KEY,
                    video: true,
                    'lambda:loadExtension': [EXTENSION_URL]
                }
            }
        });

        console.log(`   Session: ${session1.id}`);

        const browser1 = await client.puppeteer.connect(session1);
        const page1 = (await browser1.pages())[0];
        console.log('   Browser connected');

        console.log('\n2. Navigating to example.com...');
        await page1.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        // Check for extension banner
        console.log('3. Checking for extension...');
        const banner1 = await page1.evaluate(() => {
            const banner = document.getElementById('sdk-test-extension-banner');
            return banner ? banner.textContent : null;
        });

        if (banner1) {
            console.log(`   EXTENSION LOADED! Banner: "${banner1}"`);
        } else {
            console.log('   No banner element found');
            // Check body for any extension-injected content
            const bodyInfo = await page1.evaluate(() => ({
                children: document.body.children.length,
                lastChild: document.body.lastElementChild?.tagName + '#' + (document.body.lastElementChild?.id || ''),
            }));
            console.log(`   Body children: ${bodyInfo.children}, last: ${bodyInfo.lastChild}`);
        }

        await page1.screenshot({ path: 'test-output/extension-t1-direct.png', fullPage: true });
        console.log('   Screenshot: test-output/extension-t1-direct.png');

        await browser1.close();
        await client.sessions.release(session1.id);
        console.log('\n   Session 1 closed');

        // ============================================
        // Test 2: Via SDK registerCloudExtension
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: Load extension via SDK extension service');
        console.log('='.repeat(60));

        console.log('\n1. Registering extension with SDK...');
        const ext = await client.extensions.registerCloudExtension(EXTENSION_URL, {
            name: 'Test Extension',
            description: 'Adds a green banner to all pages'
        });
        console.log(`   ID: ${ext.id}`);
        console.log(`   URL: ${ext.cloudUrl}`);

        console.log('\n2. Creating session with extensionIds...');
        const session2 = await client.sessions.create({
            adapter: 'puppeteer',
            extensionIds: [ext.id],
            lambdatestOptions: {
                build: 'SDK Tests - Extension Service',
                name: 'T2 - SDK Extension Service',
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

        console.log(`   Session: ${session2.id}`);

        const browser2 = await client.puppeteer.connect(session2);
        const page2 = (await browser2.pages())[0];
        console.log('   Browser connected');

        console.log('\n3. Navigating to example.com...');
        await page2.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        const banner2 = await page2.evaluate(() => {
            const banner = document.getElementById('sdk-test-extension-banner');
            return banner ? banner.textContent : null;
        });

        if (banner2) {
            console.log(`   EXTENSION LOADED! Banner: "${banner2}"`);
        } else {
            console.log('   No banner element found');
        }

        await page2.screenshot({ path: 'test-output/extension-t2-sdk.png', fullPage: true });
        console.log('   Screenshot: test-output/extension-t2-sdk.png');

        await browser2.close();
        await client.sessions.release(session2.id);
        console.log('\n   Session 2 closed');

        // ============================================
        // Results
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('RESULTS');
        console.log('='.repeat(60));
        console.log(`\n   Test 1 (Direct URL):   ${banner1 ? 'PASSED' : 'Check screenshot'}`);
        console.log(`   Test 2 (SDK service):  ${banner2 ? 'PASSED' : 'Check screenshot'}`);
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n Test Error:', error.message);
        throw error;
    } finally {
        await client.sessions.releaseAll();
    }

    console.log('\nUsage:');
    console.log('  // Option 1: Direct URL');
    console.log("  'LT:Options': { 'lambda:loadExtension': ['https://s3-url...'] }");
    console.log('');
    console.log('  // Option 2: Via SDK');
    console.log("  const ext = await client.extensions.registerCloudExtension('https://s3-url...');");
    console.log('  await client.sessions.create({ extensionIds: [ext.id], ... });');
}

main().catch(err => {
    console.error('\n Test Failed:', err.message);
    process.exit(1);
});
