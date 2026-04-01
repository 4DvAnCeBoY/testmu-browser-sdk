import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import fs from 'fs-extra';

interface PdfOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  output?: string;
}

export async function executePdf(url: string, options: PdfOptions): Promise<void> {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;

  const browser = new Browser();
  try {
    const result = await browser.pdf({
      url,
      format: options.format || 'A4',
      landscape: options.landscape,
    });

    if (options.output) {
      const data = 'data' in result ? result.data : result;
      await fs.writeFile(options.output, data as Buffer);
      Output.success({ message: `PDF saved to ${options.output}` });
    } else {
      const data = 'data' in result ? result.data : result;
      const base64 = (data as Buffer).toString('base64');
      Output.success({ format: options.format || 'A4', base64, size: (data as Buffer).length });
    }
  } finally {
    if (typeof (browser as any).close === 'function') {
      await (browser as any).close();
    } else if (typeof (browser as any).disconnect === 'function') {
      await (browser as any).disconnect();
    }
  }
}

export function registerPdfCommand(program: any): void {
  program
    .command('pdf <url>')
    .description('Generate PDF of a webpage')
    .option('--format <format>', 'Page format: A4, Letter, Legal', 'A4')
    .option('--landscape', 'Use landscape orientation')
    .option('--output <path>', 'Save to file path')
    .action(async (url: string, options: PdfOptions) => {
      try {
        await executePdf(url, options);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
