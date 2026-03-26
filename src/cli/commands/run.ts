import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { Output } from '../output';
import { ConfigManager } from '../config';

export function resolveRunner(scriptPath: string): string {
  const ext = path.extname(scriptPath).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'ts-node';
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'node';
    default:
      throw new Error(`Unsupported file type: ${ext}. Use .ts, .js, .mjs, or .cjs`);
  }
}

interface RunOptions {
  adapter?: string;
}

export async function executeRun(scriptPath: string, options: RunOptions): Promise<void> {
  const absolutePath = path.resolve(scriptPath);

  if (!fs.existsSync(absolutePath)) {
    Output.error(`Script not found: ${absolutePath}`);
    process.exit(1);
  }

  const config = new ConfigManager();
  const creds = config.getCredentials();

  if (!creds.username || !creds.accessKey) {
    Output.error('Credentials not configured. Run: testmu-browser-cloud setup');
    process.exit(1);
  }

  const runner = resolveRunner(absolutePath);

  const env = {
    ...process.env,
    LT_USERNAME: creds.username,
    LT_ACCESS_KEY: creds.accessKey,
  };

  if (options.adapter) {
    (env as any).TESTMU_DEFAULT_ADAPTER = options.adapter;
  }

  return new Promise((resolve) => {
    const child = spawn(runner, [absolutePath], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.dirname(absolutePath),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        Output.success({ exitCode: 0, stdout: stdout.trim() });
        resolve();
      } else {
        Output.error(`Script exited with code ${code}`, { exitCode: code, stderr: stderr.trim() });
        process.exit(code || 1);
      }
    });

    child.on('error', (err: Error) => {
      if (err.message.includes('ENOENT') && runner === 'ts-node') {
        Output.error('ts-node not found. Install it: npm install -g ts-node typescript');
      } else {
        Output.error(err.message);
      }
      process.exit(1);
    });
  });
}

export function registerRunCommand(program: any): void {
  program
    .command('run <script>')
    .description('Execute a Puppeteer/Playwright/Selenium script on TestMu Cloud')
    .option('--adapter <adapter>', 'Default adapter: puppeteer, playwright, selenium')
    .action(async (script: string, options: RunOptions) => {
      try {
        await executeRun(script, options);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
