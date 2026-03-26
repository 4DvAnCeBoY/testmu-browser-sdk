import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import fs from 'fs-extra';

function getBrowser(): Browser {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;
  return new Browser();
}

interface ContextGetOptions {
  output?: string;
}

export function registerContextCommand(program: any): void {
  const context = program.command('context').description('Manage session browser context');

  context
    .command('get <sessionId>')
    .description('Get browser context (cookies, storage) for a session')
    .option('--output <path>', 'Save context JSON to file path')
    .action(async (sessionId: string, options: ContextGetOptions) => {
      try {
        const browser = getBrowser();
        const ctx = await browser.sessions.context(sessionId, null);
        if (options.output) {
          await fs.writeJson(options.output, ctx, { spaces: 2 });
          Output.success({ message: `Context saved to ${options.output}` });
        } else {
          Output.success(ctx);
        }
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  context
    .command('set <sessionId> <contextPath>')
    .description('Set browser context for a session from a JSON file')
    .action(async (sessionId: string, contextPath: string) => {
      try {
        const browser = getBrowser();
        const ctx = await fs.readJson(contextPath);
        await browser.context.setContext(null, ctx);
        Output.success({ message: `Context applied to session ${sessionId}` });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
