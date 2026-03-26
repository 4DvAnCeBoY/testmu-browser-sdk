/**
 * ============================================================================
 * TEST: Session Lifecycle Management
 * ============================================================================
 *
 * FEATURE SUMMARY:
 * ----------------
 * This test verifies the SDK's ability to track and manage multiple browser
 * sessions. The SDK maintains an in-memory list of all active sessions.
 *
 * WHAT THIS FEATURE DOES:
 * -----------------------
 * The SDK keeps track of all sessions you create in a Map (dictionary):
 *
 *   SessionRepository = {
 *     'session_123': { session data, browser ref, cleanup function },
 *     'session_456': { session data, browser ref, cleanup function },
 *     ...
 *   }
 *
 * This allows you to:
 * - Create multiple sessions at once
 * - List all active sessions
 * - Find a specific session by ID
 * - Release (cleanup) one specific session
 * - Release all sessions at once
 *
 * WHY THIS MATTERS:
 * -----------------
 * - In real apps, you might run multiple browser sessions in parallel
 * - You need to track which sessions are active
 * - You need to clean up sessions properly to avoid resource leaks
 * - If your app crashes, releaseAll() helps cleanup everything
 *
 * HOW WE IMPLEMENT IT:
 * --------------------
 * - SessionRepository class uses a Map<sessionId, sessionData>
 * - sessions.create() adds to the Map
 * - sessions.list() returns all values from the Map
 * - sessions.retrieve(id) looks up by key
 * - sessions.release(id) removes from Map and calls cleanup
 * - sessions.releaseAll() iterates and releases each session
 *
 * WHAT WE TEST:
 * -------------
 * 1. Create 3 sessions - all should have unique IDs
 * 2. sessions.list() - should return all 3 sessions
 * 3. sessions.retrieve(id) - should find specific session
 * 4. sessions.retrieve('fake') - should return undefined
 * 5. sessions.release(id) - should remove one session
 * 6. sessions.releaseAll() - should remove remaining sessions
 *
 * NOTE:
 * -----
 * This test does NOT connect to actual browsers (no puppeteer.connect).
 * It only tests the SDK's internal session tracking.
 * Sessions won't appear on LambdaTest Dashboard.
 *
 * ============================================================================
 *
 * Run:
 *   npx ts-node test-features/01c-session-lifecycle.ts
 */

import { testMuBrowser } from '../dist/testMuBrowser';

const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;

async function createSession(client: any, name: string) {
    const session = await client.sessions.create({
        adapter: 'puppeteer',
        lambdatestOptions: {
            build: 'SDK Tests - Session Lifecycle',
            name: name,
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
    return session;
}

async function main() {
    console.log('='.repeat(60));
    console.log('Test: Session Lifecycle Management');
    console.log('='.repeat(60));

    if (!LT_USERNAME || !LT_ACCESS_KEY) {
        console.log('\n❌ Missing LT_USERNAME or LT_ACCESS_KEY');
        process.exit(1);
    }

    const client = new testMuBrowser();
    let allPassed = true;

    // ============================================
    // Test 1: Create multiple sessions
    // ============================================
    console.log('\n--- Test 1: Create Multiple Sessions ---');

    const session1 = await createSession(client, 'Lifecycle Test - Session 1');
    console.log(`   ✅ Session 1: ${session1.id}`);

    const session2 = await createSession(client, 'Lifecycle Test - Session 2');
    console.log(`   ✅ Session 2: ${session2.id}`);

    const session3 = await createSession(client, 'Lifecycle Test - Session 3');
    console.log(`   ✅ Session 3: ${session3.id}`);

    // Verify all IDs are unique
    const ids = [session1.id, session2.id, session3.id];
    const uniqueIds = new Set(ids);
    if (uniqueIds.size === 3) {
        console.log('   ✅ All session IDs are unique');
    } else {
        console.log('   ❌ Session IDs are not unique!');
        allPassed = false;
    }

    // ============================================
    // Test 2: sessions.list()
    // ============================================
    console.log('\n--- Test 2: sessions.list() ---');

    const allSessions = client.sessions.list();
    console.log(`   Total sessions: ${allSessions.length}`);

    if (allSessions.length === 3) {
        console.log('   ✅ Correct session count (3)');
    } else {
        console.log(`   ❌ Expected 3, got ${allSessions.length}`);
        allPassed = false;
    }

    allSessions.forEach((s: any) => {
        console.log(`   - ${s.id} (${s.status})`);
    });

    // ============================================
    // Test 3: sessions.retrieve()
    // ============================================
    console.log('\n--- Test 3: sessions.retrieve() ---');

    const retrieved = client.sessions.retrieve(session2.id);

    if (retrieved && retrieved.id === session2.id) {
        console.log(`   ✅ Retrieved session 2: ${retrieved.id}`);
    } else {
        console.log('   ❌ Failed to retrieve session 2');
        allPassed = false;
    }

    // Test retrieve non-existent session
    const nonExistent = client.sessions.retrieve('fake-session-id');
    if (!nonExistent) {
        console.log('   ✅ Correctly returned undefined for non-existent session');
    } else {
        console.log('   ❌ Should return undefined for non-existent session');
        allPassed = false;
    }

    // ============================================
    // Test 4: sessions.release() - single session
    // ============================================
    console.log('\n--- Test 4: sessions.release() ---');

    const release1 = await client.sessions.release(session1.id);
    console.log(`   Release result: ${release1.message}`);

    if (release1.success) {
        console.log('   ✅ Session 1 released');
    } else {
        console.log('   ❌ Failed to release session 1');
        allPassed = false;
    }

    // Verify session count decreased
    const afterRelease1 = client.sessions.list();
    console.log(`   Remaining sessions: ${afterRelease1.length}`);

    if (afterRelease1.length === 2) {
        console.log('   ✅ Correct session count after release (2)');
    } else {
        console.log(`   ❌ Expected 2, got ${afterRelease1.length}`);
        allPassed = false;
    }

    // ============================================
    // Test 5: sessions.releaseAll()
    // ============================================
    console.log('\n--- Test 5: sessions.releaseAll() ---');

    const releaseAll = await client.sessions.releaseAll();
    console.log(`   Release result: ${releaseAll.message}`);

    if (releaseAll.success) {
        console.log('   ✅ All sessions released');
    } else {
        console.log('   ❌ Failed to release all sessions');
        allPassed = false;
    }

    // Verify all sessions are gone
    const finalSessions = client.sessions.list();
    console.log(`   Remaining sessions: ${finalSessions.length}`);

    if (finalSessions.length === 0) {
        console.log('   ✅ All sessions cleaned up (0 remaining)');
    } else {
        console.log(`   ❌ Expected 0, got ${finalSessions.length}`);
        allPassed = false;
    }

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
        console.log('✅ All Tests Passed!');
    } else {
        console.log('❌ Some Tests Failed!');
    }
    console.log('='.repeat(60));
    console.log('\nNote: These sessions were not connected to browsers,');
    console.log('so they won\'t appear on LambdaTest Dashboard.');
    console.log('This test verifies SDK-side session tracking only.');
}

main().catch(err => {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
});
