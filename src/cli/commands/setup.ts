import { ConfigManager } from '../config';
import { Output } from '../output';
import readline from 'readline';

interface SetupOptions {
  username?: string;
  key?: string;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function executeSetup(options: SetupOptions): Promise<void> {
  const config = new ConfigManager();

  let username = options.username;
  let accessKey = options.key;

  if (!username || !accessKey) {
    process.stderr.write('\nTestMu AI Browser Cloud Setup\n');
    process.stderr.write('=============================\n\n');
    process.stderr.write('Get your credentials at https://www.testmuai.com\n\n');

    if (!username) {
      username = await prompt('Username: ');
    }
    if (!accessKey) {
      accessKey = await prompt('Access Key: ');
    }
  }

  if (!username || !accessKey) {
    Output.error('Username and access key are required');
    process.exit(1);
  }

  config.saveConfig({ username, accessKey });
  Output.success({
    message: 'Credentials saved successfully',
    configPath: config.getConfigPath(),
  });
}
