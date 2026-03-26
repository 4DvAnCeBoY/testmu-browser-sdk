
// ============================================
// Stealth Utilities
// Shared helpers for anti-bot-detection across adapters
// ============================================

/**
 * Pool of realistic user-agent strings for Chrome and Firefox on various platforms.
 * These mimic real browser fingerprints to avoid bot detection.
 */
export const USER_AGENT_POOL: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];

/**
 * Pick a random user-agent from the pool
 */
export function getRandomUserAgent(): string {
    return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];
}

/**
 * Return a viewport with small random jitter (+/- 20px) around a base size.
 * This avoids the exact "1920x1080" fingerprint that bots typically have.
 */
export function getRandomizedViewport(
    baseWidth: number = 1920,
    baseHeight: number = 1080
): { width: number; height: number } {
    const jitter = () => Math.floor(Math.random() * 41) - 20; // -20 to +20
    return {
        width: baseWidth + jitter(),
        height: baseHeight + jitter(),
    };
}
