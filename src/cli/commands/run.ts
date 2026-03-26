import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { Output } from '../output';
import { ConfigManager } from '../config';

export function resolveRunner(scriptPath: string): { cmd: string; args: string[] } {
  const ext = path.extname(scriptPath).toLowerCase();
  switch (ext) {
    case '.ts': {
      // Check for local ts-node first, then npx fallback
      const localTsNode = path.join(path.dirname(scriptPath), 'node_modules', '.bin', 'ts-node');
      const projectTsNode = path.join(process.cwd(), 'node_modules', '.bin', 'ts-node');
      if (fs.existsSync(localTsNode)) {
        return { cmd: localTsNode, args: [] };
      }
      if (fs.existsSync(projectTsNode)) {
        return { cmd: projectTsNode, args: [] };
      }
      // Use npx as fallback (works without global install)
      return { cmd: 'npx', args: ['ts-node'] };
    }
    case '.js':
    case '.mjs':
    case '.cjs':
      return { cmd: 'node', args: [] };
    default:
      throw new Error(`Unsupported file type: ${ext}. Use .ts, .js, .mjs, or .cjs`);
  }
}

type DetectedAdapter = 'puppeteer' | 'playwright' | 'selenium' | null;

export function detectAdapter(scriptContent: string): DetectedAdapter {
  // Check for require/import patterns
  if (/require\s*\(\s*['"]playwright['"]/.test(scriptContent) ||
      /require\s*\(\s*['"]playwright-core['"]/.test(scriptContent) ||
      /from\s+['"]playwright['"]/.test(scriptContent) ||
      /from\s+['"]playwright-core['"]/.test(scriptContent) ||
      /from\s+['"]@playwright\/test['"]/.test(scriptContent)) {
    return 'playwright';
  }
  if (/require\s*\(\s*['"]puppeteer['"]/.test(scriptContent) ||
      /require\s*\(\s*['"]puppeteer-core['"]/.test(scriptContent) ||
      /from\s+['"]puppeteer['"]/.test(scriptContent) ||
      /from\s+['"]puppeteer-core['"]/.test(scriptContent)) {
    return 'puppeteer';
  }
  if (/require\s*\(\s*['"]selenium-webdriver['"]/.test(scriptContent) ||
      /from\s+['"]selenium-webdriver['"]/.test(scriptContent)) {
    return 'selenium';
  }
  return null;
}

export function usesOurSdk(scriptContent: string): boolean {
  return /require\s*\(\s*['"]@testmuai\/browser-cloud['"]/.test(scriptContent) ||
         /from\s+['"]@testmuai\/browser-cloud['"]/.test(scriptContent) ||
         /require\s*\(\s*['"]\..*\/dist['"]/.test(scriptContent);
}

function buildWsEndpoint(
  username: string,
  accessKey: string,
  adapter: string,
  options: RunOptions
): string {
  const adapterEndpointMap: Record<string, string> = {
    puppeteer: 'puppeteer',
    playwright: 'playwright',
    selenium: 'selenium',
  };
  const adapterPluginMap: Record<string, string> = {
    puppeteer: 'node-js-puppeteer',
    playwright: 'node-js-playwright',
    selenium: 'node-js-selenium',
  };

  const wsPath = adapterEndpointMap[adapter] || 'puppeteer';
  const plugin = adapterPluginMap[adapter] || 'node-js-puppeteer';

  const capabilities = {
    browserName: options.browserName || 'Chrome',
    browserVersion: options.browserVersion || 'latest',
    'LT:Options': {
      platformName: options.platformName || 'Windows 10',
      project: 'browser-cloud',
      w3c: true,
      plugin,
      build: options.build || 'testmu-browser-cloud run',
      name: options.name || path.basename(options._scriptPath || 'script'),
      username,
      accessKey,
      video: true,
      console: true,
      network: true,
      headless: options.headless === true,
    },
  };

  return `wss://${username}:${accessKey}@cdp.lambdatest.com/${wsPath}?capabilities=${encodeURIComponent(
    JSON.stringify(capabilities)
  )}`;
}

function buildHubUrl(username: string, accessKey: string): string {
  return `https://${username}:${accessKey}@hub.lambdatest.com/wd/hub`;
}

function generatePreloadScript(adapter: string, wsEndpoint: string, hubUrl: string): string {
  if (adapter === 'puppeteer') {
    return `
// TestMu Browser Cloud — Puppeteer preload
// Intercepts module loading to patch launch() → connect() at require time
(function() {
  const WS_ENDPOINT = ${JSON.stringify(wsEndpoint)};
  const Module = require('module');
  const originalLoad = Module._load;
  const PUPPETEER_MODULES = ['puppeteer', 'puppeteer-core', 'puppeteer-extra'];
  const patched = new Set();

  Module._load = function(request, parent, isMain) {
    const result = originalLoad.apply(this, arguments);

    if (PUPPETEER_MODULES.includes(request) && !patched.has(request)) {
      patched.add(request);

      function patchTarget(target, label) {
        if (target && target.launch && target.connect) {
          target.launch = async function(options) {
            console.error('[TestMu Cloud] Redirecting ' + label + '.launch() to LambdaTest cloud...');
            return target.connect({ browserWSEndpoint: WS_ENDPOINT });
          };
        }
      }

      // Patch both top-level export and .default (puppeteer uses both)
      patchTarget(result, request);
      if (result.default && result.default !== result) {
        patchTarget(result.default, request + '.default');
      }
    }

    return result;
  };
})();
`;
  }

  if (adapter === 'playwright') {
    return `
// TestMu Browser Cloud — Playwright preload
// Intercepts module loading to patch launch() → connect() at require time
(function() {
  const WS_ENDPOINT = ${JSON.stringify(wsEndpoint)};
  const Module = require('module');
  const originalLoad = Module._load;
  const PW_MODULES = ['playwright', 'playwright-core', '@playwright/test'];
  const patched = new Set();

  Module._load = function(request, parent, isMain) {
    const result = originalLoad.apply(this, arguments);

    if (PW_MODULES.includes(request) && !patched.has(request)) {
      patched.add(request);

      function patchPwTarget(target) {
        if (!target) return;
        const browserTypes = ['chromium', 'firefox', 'webkit'];
        for (const name of browserTypes) {
          const bt = target[name];
          if (bt && bt.launch && bt.connect) {
            bt.launch = async function(options) {
              console.error('[TestMu Cloud] Redirecting ' + name + '.launch() to LambdaTest cloud...');
              return bt.connect(WS_ENDPOINT);
            };
            if (bt.launchPersistentContext) {
              bt.launchPersistentContext = async function(userDataDir, options) {
                console.error('[TestMu Cloud] Redirecting ' + name + '.launchPersistentContext() to LambdaTest cloud...');
                return bt.connect(WS_ENDPOINT);
              };
            }
          }
        }
      }

      patchPwTarget(result);
      if (result.default && result.default !== result) {
        patchPwTarget(result.default);
      }
    }

    return result;
  };
})();
`;
  }

  if (adapter === 'selenium') {
    return `
// TestMu Browser Cloud — Selenium preload
// Intercepts module loading to patch Builder.build() to use LambdaTest hub
(function() {
  const HUB_URL = ${JSON.stringify(hubUrl)};
  const Module = require('module');
  const originalLoad = Module._load;
  let patched = false;

  Module._load = function(request, parent, isMain) {
    const result = originalLoad.apply(this, arguments);

    if (request === 'selenium-webdriver' && !patched) {
      patched = true;

      if (result.Builder && result.Builder.prototype.build) {
        const originalBuild = result.Builder.prototype.build;
        result.Builder.prototype.build = async function() {
          console.error('[TestMu Cloud] Redirecting Selenium to LambdaTest hub...');
          this.usingServer(HUB_URL);
          return originalBuild.call(this);
        };
      }
    }

    return result;
  };
})();
`;
  }

  return '// No adapter detected, running as-is\n';
}

interface RunOptions {
  adapter?: string;
  platformName?: string;
  browserName?: string;
  browserVersion?: string;
  build?: string;
  name?: string;
  stealth?: boolean;
  headless?: boolean;
  _scriptPath?: string;
}

export async function executeRun(scriptPath: string, options: RunOptions): Promise<void> {
  const absolutePath = path.resolve(scriptPath);

  if (!fs.existsSync(absolutePath)) {
    Output.error(`Script not found: ${absolutePath}`);
    process.exit(1);
  }

  const config = new ConfigManager();
  const creds = config.getCredentials();

  if (!creds.username || !creds.accessKey) {
    Output.error('Credentials not configured. Run: testmu-browser-cloud setup');
    process.exit(1);
  }

  const { cmd: runnerCmd, args: runnerBaseArgs } = resolveRunner(absolutePath);
  const scriptContent = fs.readFileSync(absolutePath, 'utf-8');

  // Check if script already uses our SDK
  const scriptUsesOurSdk = usesOurSdk(scriptContent);

  // Detect adapter from script or CLI flag
  const detectedAdapter = options.adapter || detectAdapter(scriptContent) || 'puppeteer';
  options._scriptPath = absolutePath;

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    LT_USERNAME: creds.username,
    LT_ACCESS_KEY: creds.accessKey,
  };

  if (options.adapter) {
    env.TESTMU_DEFAULT_ADAPTER = options.adapter;
  }

  let preloadPath: string | null = null;
  let runnerArgs: string[];

  if (scriptUsesOurSdk) {
    // Script uses our SDK — just run it with credentials in env
    process.stderr.write('[TestMu Cloud] Script uses @testmuai/browser-cloud SDK — running directly\n');
    runnerArgs = [...runnerBaseArgs, absolutePath];
  } else {
    // Script uses standard Playwright/Puppeteer/Selenium — inject preload
    const wsEndpoint = buildWsEndpoint(creds.username, creds.accessKey, detectedAdapter, options);
    const hubUrl = buildHubUrl(creds.username, creds.accessKey);

    const preloadContent = generatePreloadScript(detectedAdapter, wsEndpoint, hubUrl);
    preloadPath = path.join(os.tmpdir(), `testmu-preload-${Date.now()}.js`);
    fs.writeFileSync(preloadPath, preloadContent);

    process.stderr.write(`[TestMu Cloud] Detected ${detectedAdapter} script — patching to use LambdaTest cloud\n`);
    process.stderr.write(`[TestMu Cloud] Platform: ${options.platformName || 'Windows 10'} | Browser: ${options.browserName || 'Chrome'} ${options.browserVersion || 'latest'}\n`);

    runnerArgs = [...runnerBaseArgs, '--require', preloadPath, absolutePath];
  }

  return new Promise((resolve) => {
    const child = spawn(runnerCmd, runnerArgs, {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.dirname(absolutePath),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code: number | null) => {
      // Clean up preload file
      if (preloadPath && fs.existsSync(preloadPath)) {
        fs.removeSync(preloadPath);
      }

      if (code === 0) {
        Output.success({ exitCode: 0, stdout: stdout.trim() });
        resolve();
      } else {
        Output.error(`Script exited with code ${code}`, { exitCode: code, stderr: stderr.trim() });
        process.exit(code || 1);
      }
    });

    child.on('error', (err: Error) => {
      if (preloadPath && fs.existsSync(preloadPath)) {
        fs.removeSync(preloadPath);
      }
      if (err.message.includes('ENOENT') && runnerCmd === 'npx') {
        Output.error('ts-node not found. Install it: npm install -D ts-node typescript');
      } else {
        Output.error(err.message);
      }
      process.exit(1);
    });
  });
}

export function registerRunCommand(program: any): void {
  program
    .command('run <script>')
    .description('Execute a Puppeteer/Playwright/Selenium script on TestMu Cloud. Works with existing scripts — no SDK changes needed.')
    .option('--adapter <adapter>', 'Force adapter: puppeteer, playwright, selenium (auto-detected from script)')
    .option('--platform-name <name>', 'Platform: "Windows 11", "macOS Sonoma"', 'Windows 10')
    .option('--browser-name <name>', 'Browser: Chrome, MicrosoftEdge, pw-firefox, pw-webkit', 'Chrome')
    .option('--browser-version <version>', 'Browser version', 'latest')
    .option('--build <name>', 'Build name for LambdaTest dashboard')
    .option('--name <name>', 'Test name for LambdaTest dashboard')
    .option('--headless', 'Run in headless mode (default: headed)')
    .action(async (script: string, options: RunOptions) => {
      try {
        await executeRun(script, options);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
