import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Register StealthPlugin once to prevent double-registration.
// Import this module instead of calling puppeteerExtra.use(StealthPlugin()) in each file.
puppeteerExtra.use(StealthPlugin());

export default puppeteerExtra;
