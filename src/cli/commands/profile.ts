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

interface ProfileSessionOptions {
  session: string;
}

export function registerProfileCommand(program: any): void {
  const profile = program.command('profile').description('Manage browser profiles');

  profile
    .command('list')
    .description('List all saved profiles')
    .action(async () => {
      try {
        const browser = getBrowser();
        const profiles = await browser.profiles.list();
        Output.success(profiles);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profile
    .command('save <name>')
    .description('Save a profile from a session')
    .requiredOption('--session <id>', 'Session ID to save profile from')
    .action(async (name: string, options: ProfileSessionOptions) => {
      try {
        const browser = getBrowser();
        const result = await browser.profiles.saveProfile(name, options.session);
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profile
    .command('load <name>')
    .description('Load a profile into a session')
    .requiredOption('--session <id>', 'Session ID to load profile into')
    .action(async (name: string, options: ProfileSessionOptions) => {
      try {
        const browser = getBrowser();
        const result = await browser.profiles.loadProfile(name, options.session);
        Output.success({ loaded: result, profile: name, session: options.session });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profile
    .command('delete <name>')
    .description('Delete a profile')
    .action(async (name: string) => {
      try {
        const browser = getBrowser();
        const deleted = await (browser.profiles as any).delete(name);
        Output.success({ deleted, profile: name });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profile
    .command('export <name>')
    .description('Export a profile to JSON')
    .option('--output <path>', 'Save exported JSON to file path')
    .action(async (name: string, options: { output?: string }) => {
      try {
        const browser = getBrowser();
        const json = await browser.profiles.export(name);
        if (options.output) {
          await fs.writeFile(options.output, json);
          Output.success({ message: `Profile exported to ${options.output}` });
        } else {
          Output.success(JSON.parse(json));
        }
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  profile
    .command('import <filePath>')
    .description('Import a profile from a JSON file')
    .action(async (filePath: string) => {
      try {
        const browser = getBrowser();
        const json = await fs.readFile(filePath, 'utf-8');
        const result = await browser.profiles.import(json);
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
