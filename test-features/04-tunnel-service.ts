/**
 * ============================================================================
 * TEST: Tunnel Service (LambdaTest Cloud)
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * The Tunnel Service creates a secure connection between your local machine
 * and LambdaTest cloud browsers, enabling testing of localhost, private
 * networks, and firewalled resources.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * 1. start(config) - Start LambdaTest tunnel with credentials
 * 2. getStatus() - Check if tunnel is running
 * 3. stop() - Stop the tunnel
 *
 * WHY THIS MATTERS:
 * -----------------
 * - Test local dev servers (localhost:3000) on cloud browsers
 * - Test private staging environments not exposed to internet
 * - Test behind corporate firewalls
 * - Essential for CI/CD pipelines testing branches before merge
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - TunnelService in services/tunnel-service.ts
 * - Uses @lambdatest/node-tunnel package
 * - Creates encrypted tunnel between local machine and LambdaTest
 * - Sessions with tunnel: true can access local resources
 *
 * WHAT WE TEST:
 * -------------
 * 1. Start Tunnel - Initialize with LT credentials
 * 2. Check Status - Verify tunnel is running
 * 3. Create Session with Tunnel - Enable tunnel in session config
 * 4. Access Local Server - Cloud browser accesses localhost
 * 5. Stop Tunnel - Clean shutdown
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/04-tunnel-service.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';
import * as http from 'http';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

// Simple local HTTP server for testing
function createLocalServer(port: number): Promise<http.Server> {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Local Test Server</title></head>
                <body>
                    <h1 id="heading">Hello from localhost:${port}</h1>
                    <p id="message">This page is served from your local machine!</p>
                    <p id="timestamp">Timestamp: ${new Date().toISOString()}</p>
                </body>
                </html>
            `);
        });

        server.listen(port, () => {
            console.log(`   Local server running at http://localhost:${port}`);
            resolve(server);
        });
    });
}

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Tunnel Service (LambdaTest Cloud)');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();
    const LOCAL_PORT = 8888;
    let localServer: http.Server | null = null;

    try {
        // ============================================
        // Test 1: Start Local Server
        // ============================================
        console.log('\n--- Test 1: Start Local Server ---');
        console.log(`   Starting local HTTP server on port ${LOCAL_PORT}...`);

        localServer = await createLocalServer(LOCAL_PORT);
        console.log('   ✅ Local server started');

        // ============================================
        // Test 2: Start LambdaTest Tunnel
        // ============================================
        console.log('\n--- Test 2: Start LambdaTest Tunnel ---');
        console.log('   Starting tunnel (this may take 30-60 seconds)...');

        const tunnelName = `sdk_test_tunnel_${Date.now()}`;

        await client.tunnel.start({
            user: LT_USERNAME,
            key: LT_ACCESS_KEY,
            tunnelName: tunnelName
        });

        console.log(`   ✅ Tunnel started: ${tunnelName}`);

        // ============================================
        // Test 3: Check Tunnel Status
        // ============================================
        console.log('\n--- Test 3: Check Tunnel Status ---');

        const status = client.tunnel.getStatus();
        console.log(`   Tunnel running: ${status ? 'Yes' : 'No'}`);

        if (!status) {
            throw new Error('Tunnel is not running');
        }
        console.log('   ✅ Tunnel status verified');

        // ============================================
        // Test 4: Create Session with Tunnel
        // ============================================
        console.log('\n--- Test 4: Create Session with Tunnel ---');
        console.log('   Creating LambdaTest session with tunnel enabled...');

        const session = await client.sessions.create({
            adapter: 'puppeteer',
            tunnel: true,
            tunnelName: tunnelName,
            lambdatestOptions: {
                build: 'SDK Tests - Tunnel Service',
                name: 'Tunnel Access Test',
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

        console.log(`   ✅ Session created: ${session.id}`);

        // Connect browser
        const browser = await client.puppeteer.connect(session);
        const page = (await browser.pages())[0];
        console.log('   ✅ Browser connected');

        // ============================================
        // Test 5: Access Local Server from Cloud
        // ============================================
        console.log('\n--- Test 5: Access Local Server from Cloud ---');
        console.log(`   Navigating to http://localhost:${LOCAL_PORT}...`);

        await page.goto(`http://localhost:${LOCAL_PORT}`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Verify page content
        const pageTitle = await page.title();
        const headingText = await page.$eval('#heading', (el: any) => el.textContent);
        const messageText = await page.$eval('#message', (el: any) => el.textContent);

        console.log(`   Page title: ${pageTitle}`);
        console.log(`   Heading: ${headingText}`);
        console.log(`   Message: ${messageText}`);

        if (headingText.includes('localhost')) {
            console.log('   ✅ Successfully accessed localhost from LambdaTest cloud!');
        } else {
            console.log('   ❌ Could not verify localhost access');
        }

        // ============================================
        // Test 6: Take Screenshot as Proof
        // ============================================
        console.log('\n--- Test 6: Screenshot of Local Page ---');

        const screenshot = await page.screenshot({ encoding: 'base64' });
        console.log(`   ✅ Screenshot captured (${screenshot.length} chars base64)`);

        // Cleanup session
        await browser.close();
        await client.sessions.release(session.id);
        console.log('   ✅ Session cleaned up');

        // ============================================
        // Test 7: Stop Tunnel
        // ============================================
        console.log('\n--- Test 7: Stop Tunnel ---');

        await client.tunnel.stop();
        console.log('   ✅ Tunnel stopped');

        // Verify tunnel is stopped
        const statusAfterStop = client.tunnel.getStatus();
        console.log(`   Tunnel running after stop: ${statusAfterStop ? 'Yes' : 'No'}`);

        if (!statusAfterStop) {
            console.log('   ✅ Tunnel shutdown verified');
        }

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ All Tunnel Tests Complete!');
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n❌ Test Error:', error.message);

        // Attempt cleanup on error
        try {
            if (client.tunnel.getStatus()) {
                await client.tunnel.stop();
                console.log('   Tunnel stopped after error');
            }
        } catch (e) {
            // Ignore cleanup errors
        }

        throw error;

    } finally {
        // Stop local server
        if (localServer) {
            localServer.close();
            console.log('\n   Local server stopped');
        }
    }

    console.log('\nUsage examples:');
    console.log('  // Start tunnel');
    console.log('  await client.tunnel.start({');
    console.log('      user: LT_USERNAME,');
    console.log('      key: LT_ACCESS_KEY,');
    console.log('      tunnelName: "my-tunnel"');
    console.log('  });');
    console.log('');
    console.log('  // Check status');
    console.log('  const isRunning = client.tunnel.getStatus();');
    console.log('');
    console.log('  // Create session with tunnel');
    console.log('  await client.sessions.create({');
    console.log('      lambdatestOptions: {');
    console.log('          tunnel: true,');
    console.log('          tunnelName: "my-tunnel",');
    console.log('          ...other options');
    console.log('      }');
    console.log('  });');
    console.log('');
    console.log('  // Stop tunnel');
    console.log('  await client.tunnel.stop();');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
