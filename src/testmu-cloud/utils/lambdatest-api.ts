import { Session } from '../types.js';

/**
 * Fetch LambdaTest dashboard URL for a session (best effort).
 * Shared across Puppeteer, Playwright, and Selenium adapters.
 */
export async function fetchDashboardUrl(
    session: Session,
    options?: { testId?: string; limit?: number }
): Promise<void> {
    const username = process.env.LT_USERNAME;
    const accessKey = process.env.LT_ACCESS_KEY;
    if (!username || !accessKey) return;

    const limit = options?.limit || 1;

    try {
        const https = await import('https');
        const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');

        const data: string = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.lambdatest.com',
                path: `/automation/api/v1/sessions?limit=${limit}`,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let body = '';
                res.on('data', (chunk: any) => body += chunk);
                res.on('end', () => resolve(body));
            });
            req.on('error', reject);
            req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
            req.end();
        });

        const json = JSON.parse(data);
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            let entry = json.data[0];
            // If a testId was provided (e.g. from Selenium), try to match it
            if (options?.testId) {
                const match = json.data.find((s: any) => s.test_id === options.testId || s.session_id === options.testId);
                if (match) entry = match;
            }
            const testId = entry.test_id || entry.session_id || options?.testId;
            const buildId = entry.build_id;
            if (testId && buildId) {
                const url = `https://automation.lambdatest.com/test?build=${buildId}&testID=${testId}`;
                session.sessionViewerUrl = url;
            }
        }
    } catch {
        // Best effort — don't fail the connection if we can't get the URL
    }
}
