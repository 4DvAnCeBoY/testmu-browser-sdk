import { Output } from '../output';

describe('Output', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('json', () => {
    it('outputs compact JSON by default', () => {
      Output.json({ success: true, data: 'hello' });
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, data: 'hello' }) + '\n'
      );
    });

    it('outputs pretty JSON when pretty is true', () => {
      Output.json({ success: true }, true);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true }, null, 2) + '\n'
      );
    });
  });

  describe('success', () => {
    it('outputs success wrapper', () => {
      Output.success({ url: 'https://example.com' });
      const output = JSON.parse((consoleSpy.mock.calls[0][0] as string).trim());
      expect(output.success).toBe(true);
      expect(output.data.url).toBe('https://example.com');
    });
  });

  describe('error', () => {
    it('outputs error wrapper', () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
      Output.error('Something failed');
      const output = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
      expect(output.success).toBe(false);
      expect(output.error).toBe('Something failed');
      stderrSpy.mockRestore();
    });
  });
});
