import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';

function getBrowser(): Browser {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;
  return new Browser();
}

interface ExtensionRegisterOptions {
  name?: string;
}

export function registerExtensionCommand(program: any): void {
  const extension = program.command('extension').description('Manage browser extensions');

  extension
    .command('register <pathOrUrl>')
    .description('Register a Chrome extension from a local path or URL')
    .option('--name <name>', 'Extension name')
    .action(async (pathOrUrl: string, options: ExtensionRegisterOptions) => {
      try {
        const browser = getBrowser();
        let result: any;
        // If it looks like a URL (http/https or s3), register as cloud extension
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('s3://')) {
          result = await browser.extensions.registerCloudExtension(pathOrUrl, { name: options.name });
        } else {
          result = await browser.extensions.upload(pathOrUrl, { name: options.name });
        }
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  extension
    .command('list')
    .description('List all registered extensions')
    .action(async () => {
      try {
        const browser = getBrowser();
        const extensions = await browser.extensions.list();
        Output.success(extensions);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  extension
    .command('delete <id>')
    .description('Delete an extension by ID')
    .action(async (id: string) => {
      try {
        const browser = getBrowser();
        const deleted = await browser.extensions.delete(id);
        Output.success({ deleted, id });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
