
import * as ChromeLauncher from 'chrome-launcher';
import http from 'http';

export class LocalBrowserService {
    async launch(): Promise<{ websocketUrl: string, kill: () => Promise<void> }> {
        console.log('Searching for local Chrome installation...');

        // Launch Chrome using chrome-launcher (automagically finds Chrome/Canary/Chromium)
        const chrome = await ChromeLauncher.launch({
            startingUrl: 'about:blank',
            chromeFlags: [
                '--headless=new', // Optional: could expose this in config
                '--disable-gpu',
                '--remote-debugging-port=0' // Random port
            ]
        });

        console.log(`Chrome launched on port ${chrome.port}`);

        // Fetch the WebSocket URL from the browser's DevTools protocol
        const versionData = await this.fetchVersion(chrome.port);
        const websocketUrl = versionData.webSocketDebuggerUrl;

        return {
            websocketUrl,
            kill: async () => {
                await chrome.kill();
            }
        };
    }

    private fetchVersion(port: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }
}
