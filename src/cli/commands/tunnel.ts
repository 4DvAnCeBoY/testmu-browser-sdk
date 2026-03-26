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

interface TunnelStartOptions {
  name?: string;
}

export function registerTunnelCommand(program: any): void {
  const tunnel = program.command('tunnel').description('Manage LambdaTest tunnel');

  tunnel
    .command('start')
    .description('Start the LambdaTest tunnel')
    .option('--name <name>', 'Tunnel name')
    .action(async (options: TunnelStartOptions) => {
      try {
        const browser = getBrowser();
        const config = new ConfigManager();
        const creds = config.getCredentials();

        if (!creds.username || !creds.accessKey) {
          Output.error('Credentials required to start tunnel. Run "testmu setup" first.');
          process.exit(1);
        }

        await browser.tunnel.start({
          user: creds.username,
          key: creds.accessKey,
          tunnelName: options.name
        });
        Output.success({ message: 'Tunnel started successfully', tunnelName: options.name });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  tunnel
    .command('stop')
    .description('Stop the LambdaTest tunnel')
    .action(async () => {
      try {
        const browser = getBrowser();
        await browser.tunnel.stop();
        Output.success({ message: 'Tunnel stopped successfully' });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  tunnel
    .command('status')
    .description('Get the current tunnel status')
    .action(() => {
      try {
        const browser = getBrowser();
        const running = browser.tunnel.getStatus();
        Output.success({ running });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
