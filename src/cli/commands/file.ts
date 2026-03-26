import { Browser } from '../../testmu-cloud/index';
import { Output } from '../output';
import { ConfigManager } from '../config';
import fs from 'fs-extra';
import path from 'path';

function getBrowser(): Browser {
  const config = new ConfigManager();
  const creds = config.getCredentials();
  if (creds.username) process.env.LT_USERNAME = creds.username;
  if (creds.accessKey) process.env.LT_ACCESS_KEY = creds.accessKey;
  return new Browser();
}

interface FileDownloadOptions {
  output?: string;
}

export function registerFileCommand(program: any): void {
  const file = program.command('file').description('Manage session files');

  file
    .command('upload <sessionId> <localPath>')
    .description('Upload a file to a session')
    .action(async (sessionId: string, localPath: string) => {
      try {
        const browser = getBrowser();
        const absolutePath = path.isAbsolute(localPath) ? localPath : path.join(process.cwd(), localPath);
        const fileBuffer = await fs.readFile(absolutePath);
        const filename = path.basename(localPath);
        const result = await browser.files.uploadToSession(sessionId, fileBuffer, filename);
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  file
    .command('download <sessionId> <remotePath>')
    .description('Download a file from a session')
    .option('--output <path>', 'Save to file path')
    .action(async (sessionId: string, remotePath: string, options: FileDownloadOptions) => {
      try {
        const browser = getBrowser();
        const buffer = await browser.files.downloadFromSession(sessionId, remotePath);
        if (options.output) {
          await fs.writeFile(options.output, buffer);
          Output.success({ message: `File saved to ${options.output}` });
        } else {
          Output.success({ base64: buffer.toString('base64'), size: buffer.length });
        }
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  file
    .command('list <sessionId>')
    .description('List files in a session')
    .action(async (sessionId: string) => {
      try {
        const browser = getBrowser();
        const files = await browser.files.listSessionFiles(sessionId);
        Output.success(files);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  file
    .command('delete <sessionId> <remotePath>')
    .description('Delete a file from a session')
    .action(async (sessionId: string, remotePath: string) => {
      try {
        const browser = getBrowser();
        await browser.files.deleteFromSession(sessionId, remotePath);
        Output.success({ message: `File ${remotePath} deleted from session ${sessionId}` });
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
