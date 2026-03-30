import { detectFramework } from '../framework-detect';

describe('detectFramework', () => {
    it('returns playwright when page has context() method', () => {
        const playwrightPage = { context: () => ({}), goto: async () => {} };
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
});
