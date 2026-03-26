import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import { BrowserAdapter, Session, ReleaseResponse } from '../../testmu-cloud/types';

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
}

export async function executeSessionCreate(options: SessionCreateOptions): Promise<Session> {
  const browser = getBrowser();
  const session = await browser.sessions.create({
    adapter: (options.adapter as BrowserAdapter) || 'puppeteer',
    stealthConfig: options.stealth ? { humanizeInteractions: true, randomizeUserAgent: true } : undefined,
    proxy: options.proxy,
    tunnel: options.tunnel,
    tunnelName: options.tunnelName,
    profileId: options.profile,
    headless: options.headless,
    region: options.region,
    timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
  });
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
  return browser.sessions.release(id);
}

export async function executeSessionReleaseAll(): Promise<ReleaseResponse> {
  const browser = getBrowser();
  return browser.sessions.releaseAll();
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
