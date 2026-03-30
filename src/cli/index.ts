#!/usr/bin/env node

import { Command } from 'commander';
import { Output } from './output';
import { executeSetup } from './commands/setup';
import { registerScrapeCommand } from './commands/scrape';
import { registerScreenshotCommand } from './commands/screenshot';
import { registerPdfCommand } from './commands/pdf';
import { registerSessionCommand } from './commands/session';
import { registerComputerCommands } from './commands/computer';
import { registerRunCommand } from './commands/run';
import { registerFileCommand } from './commands/file';
import { registerContextCommand } from './commands/context';
import { registerProfileCommand } from './commands/profile';
import { registerExtensionCommand } from './commands/extension';
import { registerCredentialCommand } from './commands/credential';
import { registerCaptchaCommand } from './commands/captcha';
import { registerTunnelCommand } from './commands/tunnel';
import { registerEventsCommand } from './commands/events';
import { registerPageCommand } from './commands/page';
import pkg from '../../package.json';

const program = new Command();

program
  .name('testmu-browser-cloud')
  .description('Cloud browser automation for AI agents — powered by TestMu AI')
  .version(pkg.version)
  .option('--pretty', 'Pretty-print JSON output')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().pretty) {
      Output.setPretty(true);
    }
  });

// Setup
program
  .command('setup')
  .description('Configure TestMu AI credentials')
  .option('--username <username>', 'TestMu AI username')
  .option('--key <key>', 'TestMu AI access key')
  .action(async (options) => {
    try {
      await executeSetup(options);
    } catch (err) {
      Output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// Quick Actions
registerScrapeCommand(program);
registerScreenshotCommand(program);
registerPdfCommand(program);

// Session Management
registerSessionCommand(program);

// Computer Actions
registerComputerCommands(program);

// Script Execution
registerRunCommand(program);

// Service Commands
registerFileCommand(program);
registerContextCommand(program);
registerProfileCommand(program);
registerExtensionCommand(program);
registerCredentialCommand(program);
registerCaptchaCommand(program);
registerTunnelCommand(program);
registerEventsCommand(program);

// Page Tools (agent-browser parity)
registerPageCommand(program);

program.parse(process.argv);
