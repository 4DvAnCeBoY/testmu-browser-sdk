import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';

interface ScrapeOptions {
  format?: 'markdown' | 'html' | 'text' | 'readability';
  waitFor?: string;
  delay?: string;
}

export async function executeScrape(
  url: string,
  options: ScrapeOptions
): Promise<{ success: boolean; data: any }> {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;

  const browser = new Browser();
  try {
    const result = await browser.scrape({
      url,
      format: options.format || 'markdown',
      waitFor: options.waitFor,
      delay: options.delay ? parseInt(options.delay, 10) : undefined,
    });

    return { success: true, data: result };
  } finally {
    if (typeof (browser as any).close === 'function') {
      await (browser as any).close();
    } else if (typeof (browser as any).disconnect === 'function') {
      await (browser as any).disconnect();
    }
  }
}

export function registerScrapeCommand(program: any): void {
  program
    .command('scrape <url>')
    .description('Scrape a webpage and return its content')
    .option('--format <format>', 'Output format: markdown, html, text, readability', 'markdown')
    .option('--wait-for <selector>', 'CSS selector to wait for before scraping')
    .option('--delay <ms>', 'Delay in ms before scraping')
    .action(async (url: string, options: ScrapeOptions) => {
      try {
        const result = await executeScrape(url, options);
        Output.success(result.data);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
