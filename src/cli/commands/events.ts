import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import { getSessionStore } from '../page-manager';

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
        let details = await browser.sessions.liveDetails(sessionId);

        // Bug #9 fix: cross-process fallback — if SDK returns null (session
        // not in this process's memory), build structured details from disk.
        if (!details) {
          const store = getSessionStore();
          const session = await store.get(sessionId);
          if (session) {
            // Strip credentials from WebSocket URL
            let safeWsUrl = session.websocketUrl;
            try {
              const parsed = new URL(session.websocketUrl);
              parsed.username = '';
              parsed.password = '';
              safeWsUrl = parsed.toString();
            } catch { /* not a valid URL — return as-is */ }

            details = {
              pages: [{
                id: 'page_0',
                url: 'about:blank',
                title: 'Browser Tab',
                favicon: null,
                sessionViewerUrl: (session as any).sessionViewerUrl || (session as any).debugUrl || '',
                sessionViewerFullscreenUrl: (session as any).sessionViewerUrl || (session as any).debugUrl || '',
              }],
              wsUrl: safeWsUrl,
              sessionViewerUrl: (session as any).sessionViewerUrl || (session as any).debugUrl || '',
              sessionViewerFullscreenUrl: (session as any).sessionViewerUrl || (session as any).debugUrl || '',
            };
          }
        }

        Output.success(details);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
