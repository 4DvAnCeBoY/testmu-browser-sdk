import { detectFramework } from '../framework-detect';

describe('detectFramework', () => {
    it('returns playwright when page has both locator() and context() methods', () => {
        const playwrightPage = { locator: () => ({}), context: () => ({}), goto: async () => {} };
        expect(detectFramework(playwrightPage)).toBe('playwright');
    });

    it('returns puppeteer when page lacks context() method', () => {
        const puppeteerPage = { goto: async () => {}, cookies: async () => [] };
        expect(detectFramework(puppeteerPage)).toBe('puppeteer');
    });

    it('returns puppeteer when context is a property not a function', () => {
        const page = { context: 'not-a-function', goto: async () => {} };
        expect(detectFramework(page)).toBe('puppeteer');
    });

    it('returns puppeteer when page has context() but not locator()', () => {
        const page = { context: () => ({}), goto: async () => {} };
        expect(detectFramework(page)).toBe('puppeteer');
    });

    it('returns puppeteer when page has locator() but not context()', () => {
        const page = { locator: () => ({}), goto: async () => {} };
        expect(detectFramework(page)).toBe('puppeteer');
    });
});
