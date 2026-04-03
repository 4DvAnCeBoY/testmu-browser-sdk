import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';

const SESSIONS_DIR = path.join(os.homedir(), '.testmuai', 'sessions');

/** Sanitize ID to prevent path traversal */
function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export class LocalBrowserService {
    /** Find Chrome executable on the system */
    private findChrome(): string {
        const candidates = [
            // macOS
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            // Linux
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            // Windows (WSL/Cygwin)
            '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
            '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        ];
        for (const c of candidates) {
            if (fs.existsSync(c)) return c;
        }
        throw new Error(
            'Chrome not found. Install Google Chrome or set CHROME_PATH env var.\n' +
            'On macOS: brew install --cask google-chrome\n' +
            'On Linux: apt install google-chrome-stable'
        );
    }

    async launch(): Promise<{ websocketUrl: string, port: number, pid: number, profileDir: string, kill: () => Promise<void> }> {
        console.error('Searching for local Chrome installation...');

        const chromePath = process.env.CHROME_PATH || this.findChrome();
        const tmpProfile = path.join(os.tmpdir(), `testmu-chrome-${process.pid}-${Date.now()}`);
        await fs.ensureDir(tmpProfile);

        const args = [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--remote-debugging-port=0', // Let OS assign a free port
            `--user-data-dir=${tmpProfile}`,
            'about:blank',
        ];

        // Detach Chrome so it survives the parent CLI process exiting
        let chromeProcess: ChildProcess;
        try {
            chromeProcess = spawn(chromePath, args, {
                stdio: ['ignore', 'ignore', 'pipe'],
                detached: true,
            });
        } catch (err: any) {
            throw new Error(`Failed to launch Chrome at "${chromePath}": ${err.message}`);
        }

        if (!chromeProcess.pid) {
            throw new Error(`Failed to launch Chrome: process has no PID. Path: "${chromePath}"`);
        }
        const chromePid = chromeProcess.pid;

        // Wait for "DevTools listening on" message from stderr (includes OS-assigned port)
        let stderrOutput = '';
        const websocketUrl = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(
                    `Chrome did not start within 10s. Path: "${chromePath}"\n` +
                    `stderr output: ${stderrOutput.slice(0, 500)}`
                ));
            }, 10000);

            chromeProcess.stderr?.on('data', (data: Buffer) => {
                const line = data.toString();
                stderrOutput += line;
                const match = line.match(/DevTools listening on (ws:\/\/[^\s]+)/);
                if (match) {
                    clearTimeout(timeout);
                    resolve(match[1]);
                }
            });

            chromeProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`Chrome process error: ${err.message}. Path: "${chromePath}"`));
            });

            chromeProcess.on('exit', (code) => {
                clearTimeout(timeout);
                reject(new Error(
                    `Chrome exited with code ${code} before DevTools was ready. Path: "${chromePath}"\n` +
                    `stderr: ${stderrOutput.slice(0, 500)}`
                ));
            });
        });

        // Now that we have the URL, unref so the CLI process can exit
        chromeProcess.stderr?.removeAllListeners();
        chromeProcess.removeAllListeners();
        chromeProcess.unref();
        // Unref the stderr pipe so it doesn't keep the process alive
        if (chromeProcess.stderr) (chromeProcess.stderr as any).unref?.();

        // Extract actual port from the WebSocket URL assigned by the OS
        let actualPort = 0;
        try { actualPort = parseInt(new URL(websocketUrl).port, 10); } catch { /* best effort */ }
        console.error(`Chrome launched on port ${actualPort}, PID ${chromePid} (profile: ${tmpProfile})`);

        return {
            websocketUrl,
            port: actualPort,
            pid: chromePid,
            profileDir: tmpProfile,
            kill: async () => {
                // Kill Chrome process by PID (works cross-process)
                try { process.kill(chromePid); } catch { /* already dead */ }
                await fs.remove(tmpProfile).catch(() => {});
            }
        };
    }

    /**
     * Persist Chrome PID and profile path so a separate CLI process can kill Chrome on release.
     */
    static async savePidFile(sessionId: string, pid: number, profileDir: string): Promise<void> {
        const dir = path.join(SESSIONS_DIR, sanitizeId(sessionId));
        await fs.ensureDir(dir);
        await fs.writeJson(path.join(dir, 'chrome.json'), { pid, profileDir }, { mode: 0o600 });
    }

    /**
     * Kill Chrome from a previous session using the saved PID file.
     */
    static async killFromPidFile(sessionId: string): Promise<void> {
        const pidFile = path.join(SESSIONS_DIR, sanitizeId(sessionId), 'chrome.json');
        if (!await fs.pathExists(pidFile)) return;
        try {
            const { pid, profileDir } = await fs.readJson(pidFile);
            try { process.kill(pid); } catch { /* already dead */ }
            if (profileDir) await fs.remove(profileDir).catch(() => {});
            await fs.remove(pidFile).catch(() => {});
        } catch { /* best effort */ }
    }
}
