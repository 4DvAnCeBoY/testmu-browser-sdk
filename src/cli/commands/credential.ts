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

export function registerCredentialCommand(program: any): void {
  const credential = program.command('credential').description('Manage stored credentials');

  credential
    .command('add <url> <username> <password>')
    .description('Add a credential for a URL')
    .action(async (url: string, username: string, password: string) => {
      try {
        const browser = getBrowser();
        const result = await browser.credentials.create({ url, username, password });
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  credential
    .command('list')
    .description('List all stored credentials')
    .action(async () => {
      try {
        const browser = getBrowser();
        const credentials = await browser.credentials.list();
        Output.success(credentials);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  credential
    .command('delete <id>')
    .description('Delete a credential by ID')
    .action(async (id: string) => {
      try {
        const browser = getBrowser();
        await browser.credentials.delete(id);
        Output.success({ deleted: true, id });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  credential
    .command('get <id>')
    .description('Get a credential by ID')
    .action(async (id: string) => {
      try {
        const browser = getBrowser();
        const result = await browser.credentials.get(id);
        if (result) {
          Output.success(result);
        } else {
          Output.error(`Credential ${id} not found`);
          process.exit(1);
        }
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  credential
    .command('find <url>')
    .description('Find a credential for a URL')
    .action(async (url: string) => {
      try {
        const browser = getBrowser();
        const result = await browser.credentials.findForUrl(url);
        if (result) {
          Output.success(result);
        } else {
          Output.error(`No credential found for URL: ${url}`);
          process.exit(1);
        }
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
