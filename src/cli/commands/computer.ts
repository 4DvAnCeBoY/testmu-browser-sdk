import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import { ComputerActionType } from '../../testmu-cloud/types';
import { getSessionPage, DEFAULT_CLIENT_ID } from '../page-manager';
import fs from 'fs-extra';

async function executeComputerAction(
  action: ComputerActionType,
  options: {
    session: string;
    x?: string;
    y?: string;
    text?: string;
    deltaX?: string;
    deltaY?: string;
    output?: string;
  }
): Promise<void> {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;

  const browser = new Browser();
  const { page, cleanup } = await getSessionPage(options.session, { clientId: DEFAULT_CLIENT_ID });

  let result: any;
  try {
    result = await browser.sessions.computer(options.session, page, {
      action,
      coordinate: options.x && options.y ? [parseInt(options.x, 10), parseInt(options.y, 10)] : undefined,
      text: options.text,
      deltaX: options.deltaX ? parseInt(options.deltaX, 10) : undefined,
      deltaY: options.deltaY ? parseInt(options.deltaY, 10) : undefined,
    });
  } finally {
    await cleanup();
  }

  if (result.error) {
    Output.error(result.error);
    process.exit(1);
  }

  if (result.base64_image && options.output) {
    const buffer = Buffer.from(result.base64_image, 'base64');
    await fs.writeFile(options.output, buffer);
    Output.success({ message: `Screenshot saved to ${options.output}`, output: result.output });
  } else {
    Output.success(result);
  }
}

export function registerComputerCommands(program: any): void {
  program
    .command('click <x> <y>')
    .description('Click at coordinates')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (x: string, y: string, options: { session: string }) => {
      try {
        await executeComputerAction('click', { ...options, x, y });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('double-click <x> <y>')
    .description('Double-click at coordinates')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (x: string, y: string, options: { session: string }) => {
      try {
        await executeComputerAction('double_click', { ...options, x, y });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('right-click <x> <y>')
    .description('Right-click at coordinates')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (x: string, y: string, options: { session: string }) => {
      try {
        await executeComputerAction('right_click', { ...options, x, y });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('type <text>')
    .description('Type text in the active element')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (text: string, options: { session: string }) => {
      try {
        await executeComputerAction('type', { ...options, text });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('key <key>')
    .description('Press a keyboard key (e.g., Enter, Escape, Tab)')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (key: string, options: { session: string }) => {
      try {
        await executeComputerAction('key', { ...options, text: key });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('scroll <deltaX> <deltaY>')
    .description('Scroll by delta amounts')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (deltaX: string, deltaY: string, options: { session: string }) => {
      try {
        await executeComputerAction('scroll', { ...options, deltaX, deltaY });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('move <x> <y>')
    .description('Move mouse to coordinates')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (x: string, y: string, options: { session: string }) => {
      try {
        await executeComputerAction('move', { ...options, x, y });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('computer-screenshot')
    .description('Take a screenshot of the current session')
    .requiredOption('--session <id>', 'Session ID')
    .option('--output <path>', 'Save screenshot to file')
    .action(async (options: { session: string; output?: string }) => {
      try {
        await executeComputerAction('screenshot', options);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
