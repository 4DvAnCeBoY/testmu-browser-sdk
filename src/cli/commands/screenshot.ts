import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import fs from 'fs-extra';

interface ScreenshotOptions {
  fullPage?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  output?: string;
  quality?: string;
}

export async function executeScreenshot(
  url: string,
  options: ScreenshotOptions
): Promise<void> {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;

  const browser = new Browser();
  try {
    const result = await browser.screenshot({
      url,
      fullPage: options.fullPage ?? false,
      format: options.format || 'png',
      quality: options.quality ? parseInt(options.quality, 10) : undefined,
    });

    if (options.output) {
      const data = 'data' in result ? result.data : result;
      await fs.writeFile(options.output, data as Buffer);
      Output.success({ message: `Screenshot saved to ${options.output}` });
    } else {
      const data = 'data' in result ? result.data : result;
      const base64 = (data as Buffer).toString('base64');
      Output.success({
        format: options.format || 'png',
        base64,
        size: (data as Buffer).length,
      });
    }
  } finally {
    if (typeof (browser as any).close === 'function') {
      await (browser as any).close();
    } else if (typeof (browser as any).disconnect === 'function') {
      await (browser as any).disconnect();
    }
  }
}

export function registerScreenshotCommand(program: any): void {
  program
    .command('screenshot <url>')
    .description('Take a screenshot of a webpage')
    .option('--full-page', 'Capture full page')
    .option('--format <format>', 'Image format: png, jpeg, webp', 'png')
    .option('--output <path>', 'Save to file path')
    .option('--quality <quality>', 'JPEG quality (0-100)')
    .action(async (url: string, options: ScreenshotOptions) => {
      try {
        await executeScreenshot(url, options);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
