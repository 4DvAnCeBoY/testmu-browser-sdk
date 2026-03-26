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

interface CaptchaSolveOptions {
  session: string;
  type?: 'recaptcha' | 'hcaptcha' | 'turnstile';
}

interface CaptchaStatusOptions {
  session: string;
}

export function registerCaptchaCommand(program: any): void {
  const captcha = program.command('captcha').description('Manage captcha solving');

  captcha
    .command('solve')
    .description('Solve a captcha for a session')
    .requiredOption('--session <id>', 'Session ID')
    .option('--type <type>', 'Captcha type: recaptcha, hcaptcha, turnstile')
    .action(async (options: CaptchaSolveOptions) => {
      try {
        const browser = getBrowser();
        const result = await browser.sessions.captchas.solveImage(options.session, {
          type: options.type || 'recaptcha'
        });
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  captcha
    .command('status')
    .description('Get captcha solving status for a session')
    .requiredOption('--session <id>', 'Session ID')
    .action(async (options: CaptchaStatusOptions) => {
      try {
        const browser = getBrowser();
        const result = await browser.sessions.captchas.status(options.session);
        Output.success(result);
      } catch (err) {
        Output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
