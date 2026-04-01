import { ConfigManager } from '../config';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

jest.mock('fs-extra');

describe('ConfigManager', () => {
  const mockConfigDir = path.join(os.homedir(), '.testmuai');
  const mockConfigPath = path.join(mockConfigDir, 'config.json');

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.LT_USERNAME;
    delete process.env.LT_ACCESS_KEY;
  });

  describe('getCredentials', () => {
    it('returns env vars when set', () => {
      process.env.LT_USERNAME = 'env_user';
      process.env.LT_ACCESS_KEY = 'env_key';

      const config = new ConfigManager();
      const creds = config.getCredentials();

      expect(creds.username).toBe('env_user');
      expect(creds.accessKey).toBe('env_key');
    });

    it('returns config file values when env vars not set', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue({
        username: 'file_user',
        accessKey: 'file_key',
      });

      const config = new ConfigManager();
      const creds = config.getCredentials();

      expect(creds.username).toBe('file_user');
      expect(creds.accessKey).toBe('file_key');
    });

    it('returns undefined when no credentials found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      const creds = config.getCredentials();

      expect(creds.username).toBeUndefined();
      expect(creds.accessKey).toBeUndefined();
    });

    it('prefers env vars over config file', () => {
      process.env.LT_USERNAME = 'env_user';
      process.env.LT_ACCESS_KEY = 'env_key';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue({
        username: 'file_user',
        accessKey: 'file_key',
      });

      const config = new ConfigManager();
      const creds = config.getCredentials();

      expect(creds.username).toBe('env_user');
      expect(creds.accessKey).toBe('env_key');
    });
  });

  describe('saveConfig', () => {
    it('creates config directory and writes file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.ensureDirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeJsonSync as jest.Mock).mockReturnValue(undefined);

      const config = new ConfigManager();
      config.saveConfig({ username: 'test', accessKey: 'key123' });

      expect(fs.ensureDirSync).toHaveBeenCalledWith(mockConfigDir, { mode: 0o700 });
      expect(fs.writeJsonSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.objectContaining({ username: 'test', accessKey: 'key123' }),
        { spaces: 2, mode: 0o600 }
      );
    });
  });

  describe('loadConfig', () => {
    it('returns empty config when file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      const loaded = config.loadConfig();

      expect(loaded).toEqual({});
    });

    it('returns parsed config when file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJsonSync as jest.Mock).mockReturnValue({
        username: 'saved_user',
        accessKey: 'saved_key',
        defaultAdapter: 'playwright',
      });

      const config = new ConfigManager();
      const loaded = config.loadConfig();

      expect(loaded.username).toBe('saved_user');
      expect(loaded.defaultAdapter).toBe('playwright');
    });
  });
});
