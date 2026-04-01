import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface PluginConfig {
  username?: string;
  accessKey?: string;
  defaultAdapter?: 'puppeteer' | 'playwright' | 'selenium';
  defaultRegion?: string;
}

export class ConfigManager {
  private configDir: string;
  private configPath: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.testmuai');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  getCredentials(): { username?: string; accessKey?: string } {
    const envUsername = process.env.LT_USERNAME;
    const envAccessKey = process.env.LT_ACCESS_KEY;

    if (envUsername && envAccessKey) {
      return { username: envUsername, accessKey: envAccessKey };
    }

    const fileConfig = this.loadConfig();
    return {
      username: envUsername || fileConfig.username,
      accessKey: envAccessKey || fileConfig.accessKey,
    };
  }

  loadConfig(): PluginConfig {
    if (!fs.existsSync(this.configPath)) {
      return {};
    }
    return fs.readJsonSync(this.configPath) as PluginConfig;
  }

  saveConfig(config: PluginConfig): void {
    const existing = this.loadConfig();
    const merged = { ...existing, ...config };
    fs.ensureDirSync(this.configDir, { mode: 0o700 });
    fs.writeJsonSync(this.configPath, merged, { spaces: 2, mode: 0o600 });
  }

  getConfigPath(): string {
    return this.configPath;
  }

  hasCredentials(): boolean {
    const creds = this.getCredentials();
    return !!(creds.username && creds.accessKey);
  }

  /**
   * Detect known placeholder/doc-example credentials that won't authenticate.
   */
  hasPlaceholderCredentials(): boolean {
    const creds = this.getCredentials();
    return arePlaceholderCredentials(creds.username, creds.accessKey);
  }
}

const PLACEHOLDER_PATTERNS = [
  /^your[_-]?(username|user|lt[_-]?username)?$/i,
  /^your[_-]?(access[_-]?key|key|lt[_-]?access[_-]?key)?$/i,
  /^generic[_-]?user$/i,
  /^YOUR_LT_/i,
  /^placeholder/i,
  /^test[_-]?user$/i,
  /^xxx+$/i,
];

export function arePlaceholderCredentials(username?: string, accessKey?: string): boolean {
  if (!username || !accessKey) return false;
  return PLACEHOLDER_PATTERNS.some(p => p.test(username)) ||
         PLACEHOLDER_PATTERNS.some(p => p.test(accessKey));
}
