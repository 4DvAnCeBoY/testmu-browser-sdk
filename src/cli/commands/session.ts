import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import { BrowserAdapter, Session, ReleaseResponse } from '../../testmu-cloud/types';
import fs from 'fs-extra';
import { getSessionStore } from '../page-manager';

let browserInstance: Browser | null = null;

function getBrowser(): Browser {
  if (!browserInstance) {
    const config = new ConfigManager();
    const creds = config.getCredentials();
    if (creds.username) process.env.LT_USERNAME = creds.username;
    if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;
    browserInstance = new Browser();
  }
  return browserInstance;
}

interface SessionCreateOptions {
  adapter?: string;
  stealth?: boolean;
  proxy?: string;
  tunnel?: boolean;
  tunnelName?: string;
  profile?: string;
  headless?: boolean;
  region?: string;
  timeout?: string;
  sessionContext?: string;
  credentials?: boolean;
  platformName?: string;
  browserName?: string;
  browserVersion?: string;
  deviceName?: string;
  build?: string;
  name?: string;
  local?: boolean;
}

export async function executeSessionCreate(options: SessionCreateOptions): Promise<Session> {
  const browser = getBrowser();
  const config = new ConfigManager();
  const creds = config.getCredentials();

  // Fail fast on placeholder credentials
  if (!options.local && config.hasPlaceholderCredentials()) {
    throw new Error(
      'Detected placeholder credentials. Run "testmu-browser-cloud setup" with real LambdaTest credentials. ' +
      'Get yours at https://www.testmuai.com'
    );
  }

  let sessionContext: any = undefined;
  if (options.sessionContext) {
    sessionContext = await fs.readJson(options.sessionContext);
  }

  const lambdatestOptions: Record<string, any> = {};
  if (options.platformName) lambdatestOptions.platformName = options.platformName;
  if (options.browserName) lambdatestOptions.browserName = options.browserName;
  if (options.browserVersion) lambdatestOptions.browserVersion = options.browserVersion;
  if (options.deviceName) lambdatestOptions.deviceName = options.deviceName;
  if (options.build) lambdatestOptions.build = options.build;
  // Auto-generate a unique, meaningful session name if not provided
  // Format: cli-{adapter}-{YYYY-MM-DD-HHmmss}-{4char-random}
  const sessionName = options.name || `cli-${options.adapter || 'puppeteer'}-${new Date().toISOString().replace(/[:.T]/g, '-').slice(0, 19)}-${Math.random().toString(36).slice(2, 6)}`;
  lambdatestOptions.name = sessionName;
  if (creds.username || creds.accessKey) {
    lambdatestOptions['LT:Options'] = {
      username: creds.username,
      accessKey: creds.accessKey,
    };
  }

  const session = await browser.sessions.create({
    adapter: (options.adapter as BrowserAdapter) || 'puppeteer',
    local: options.local || false,
    stealthConfig: options.stealth ? { humanizeInteractions: true, randomizeUserAgent: true } : undefined,
    proxy: options.proxy,
    tunnel: options.tunnel,
    tunnelName: options.tunnelName,
    profileId: options.profile,
    headless: options.headless,
    region: options.region,
    timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
    sessionContext,
    credentials: options.credentials ? {} : undefined,
    lambdatestOptions: Object.keys(lambdatestOptions).length > 0 ? lambdatestOptions : undefined,
  });

  // Persist session to disk for cross-process CLI usage (page commands)
  const store = getSessionStore();
  await store.save(session);

  return session;
}

export function executeSessionList(): Session[] {
  const browser = getBrowser();
  return browser.sessions.list();
}

export function executeSessionInfo(id: string): Session | undefined {
  const browser = getBrowser();
  return browser.sessions.retrieve(id);
}

export async function executeSessionRelease(id: string): Promise<ReleaseResponse> {
  const browser = getBrowser();
  const result = await browser.sessions.release(id);
  // Clean up disk persistence
  const store = getSessionStore();
  await store.delete(id);
  return result;
}

export async function executeSessionReleaseAll(): Promise<ReleaseResponse> {
  const browser = getBrowser();
  const result = await browser.sessions.releaseAll();
  const store = getSessionStore();
  await store.deleteAll();
  return result;
}

export function registerSessionCommand(program: any): void {
  const session = program.command('session').description('Manage browser sessions');

  session
    .command('create')
    .description('Create a new cloud browser session')
    .option('--adapter <adapter>', 'Browser adapter: puppeteer, playwright, selenium', 'puppeteer')
    .option('--stealth', 'Enable stealth mode')
    .option('--proxy <url>', 'Proxy URL')
    .option('--tunnel', 'Enable tunnel for localhost access')
    .option('--tunnel-name <name>', 'Tunnel name')
    .option('--profile <id>', 'Profile ID for session persistence')
    .option('--headless', 'Run in headless mode')
    .option('--region <region>', 'Cloud region')
    .option('--timeout <ms>', 'Session timeout in ms')
    .option('--session-context <path>', 'Path to JSON file with saved auth context (cookies, localStorage)')
    .option('--credentials', 'Enable auto-fill credentials')
    .option('--platform-name <name>', 'Platform name, e.g. "Windows 11", "macOS Sonoma"')
    .option('--browser-name <name>', 'Browser name, e.g. "Chrome", "Firefox", "Safari"')
    .option('--browser-version <version>', 'Browser version, e.g. "latest", "120"')
    .option('--device-name <name>', 'Device name, e.g. "Samsung Galaxy S24"')
    .option('--build <name>', 'Build name for LambdaTest dashboard')
    .option('--name <name>', 'Session name for LambdaTest dashboard')
    .option('--local', 'Launch local Chrome instead of cloud')
    .action(async (options: SessionCreateOptions) => {
      try {
        const session = await executeSessionCreate(options);
        Output.success(session);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  session
    .command('list')
    .description('List all active sessions')
    .action(() => {
      try {
        const sessions = executeSessionList();
        Output.success(sessions);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  session
    .command('info <id>')
    .description('Get details of a specific session')
    .action((id: string) => {
      try {
        const session = executeSessionInfo(id);
        if (session) {
          Output.success(session);
        } else {
          Output.error(`Session ${id} not found`);
          process.exit(1);
        }
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  session
    .command('release <id>')
    .description('Release a specific session')
    .action(async (id: string) => {
      try {
        const result = await executeSessionRelease(id);
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  session
    .command('release-all')
    .description('Release all active sessions')
    .action(async () => {
      try {
        const result = await executeSessionReleaseAll();
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
