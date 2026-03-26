import { ConfigManager } from '../config';

jest.mock('../config');

describe('setup command', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Mock process.exit to prevent test from exiting
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    // Mock stdout/stderr
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves credentials via ConfigManager in non-interactive mode', async () => {
    const mockSave = jest.fn();
    const mockGetPath = jest.fn().mockReturnValue('/home/user/.testmuai/config.json');
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).prototype.saveConfig = mockSave;
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).prototype.getConfigPath = mockGetPath;

    const { executeSetup } = require('../commands/setup');
    await executeSetup({ username: 'test_user', key: 'test_key' });

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'test_user', accessKey: 'test_key' })
    );
  });
});
