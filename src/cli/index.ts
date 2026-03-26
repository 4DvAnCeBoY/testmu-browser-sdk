#!/usr/bin/env node

import { Command } from 'commander';
import { Output } from './output';
import { executeSetup } from './commands/setup';

const program = new Command();

program
  .name('testmu-browser-cloud')
  .description('Cloud browser automation for AI agents — powered by TestMu AI')
  .version(require('../../package.json').version)
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

program.parse(process.argv);
