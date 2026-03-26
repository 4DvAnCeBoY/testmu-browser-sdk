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

export function registerEventsCommand(program: any): void {
  program
    .command('events <sessionId>')
    .description('Get recorded events for a session')
    .action((sessionId: string) => {
      try {
        const browser = getBrowser();
        const events = browser.sessions.events(sessionId);
        Output.success(events);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('live-details <sessionId>')
    .description('Get live details for a session (pages, tabs, state)')
    .action(async (sessionId: string) => {
      try {
        const browser = getBrowser();
        const details = await browser.sessions.liveDetails(sessionId);
        Output.success(details);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
