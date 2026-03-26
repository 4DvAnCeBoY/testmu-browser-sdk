import { resolveRunner } from '../commands/run';

describe('run command', () => {
  describe('resolveRunner', () => {
    it('returns ts-node for .ts files', () => {
      expect(resolveRunner('test.ts')).toBe('ts-node');
    });

    it('returns node for .js files', () => {
      expect(resolveRunner('test.js')).toBe('node');
    });

    it('returns node for .mjs files', () => {
      expect(resolveRunner('test.mjs')).toBe('node');
    });

    it('returns node for .cjs files', () => {
      expect(resolveRunner('test.cjs')).toBe('node');
    });

    it('throws for unsupported extensions', () => {
      expect(() => resolveRunner('test.py')).toThrow('Unsupported file type');
    });
  });
});
