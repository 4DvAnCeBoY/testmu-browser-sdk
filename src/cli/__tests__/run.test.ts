import { resolveRunner, detectAdapter, usesOurSdk } from '../commands/run';

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

  describe('detectAdapter', () => {
    it('detects playwright from require', () => {
      expect(detectAdapter("const { chromium } = require('playwright');")).toBe('playwright');
    });

    it('detects playwright from import', () => {
      expect(detectAdapter("import { chromium } from 'playwright';")).toBe('playwright');
    });

    it('detects playwright-core', () => {
      expect(detectAdapter("const pw = require('playwright-core');")).toBe('playwright');
    });

    it('detects @playwright/test', () => {
      expect(detectAdapter("import { test } from '@playwright/test';")).toBe('playwright');
    });

    it('detects puppeteer from require', () => {
      expect(detectAdapter("const puppeteer = require('puppeteer');")).toBe('puppeteer');
    });

    it('detects puppeteer from import', () => {
      expect(detectAdapter("import puppeteer from 'puppeteer';")).toBe('puppeteer');
    });

    it('detects puppeteer-core', () => {
      expect(detectAdapter("const pup = require('puppeteer-core');")).toBe('puppeteer');
    });

    it('detects selenium-webdriver from require', () => {
      expect(detectAdapter("const { Builder } = require('selenium-webdriver');")).toBe('selenium');
    });

    it('detects selenium-webdriver from import', () => {
      expect(detectAdapter("import { Builder } from 'selenium-webdriver';")).toBe('selenium');
    });

    it('returns null for unknown scripts', () => {
      expect(detectAdapter("console.log('hello');")).toBeNull();
    });
  });

  describe('usesOurSdk', () => {
    it('detects @testmuai/browser-cloud require', () => {
      expect(usesOurSdk("const { Browser } = require('@testmuai/browser-cloud');")).toBe(true);
    });

    it('detects @testmuai/browser-cloud import', () => {
      expect(usesOurSdk("import { Browser } from '@testmuai/browser-cloud';")).toBe(true);
    });

    it('returns false for standard playwright', () => {
      expect(usesOurSdk("const { chromium } = require('playwright');")).toBe(false);
    });
  });
});
