# Captchas API

Automated browsing often encounters CAPTCHAs (ReCaptcha, hCaptcha, Turnstile). **testMuBrowser** provides a unified API to programmatically solve these challenges.

## Supported Providers

The SDK uses an adapter pattern. Currently, it includes a **Mock/Simulated** solver for testing. You can extend `CaptchaService` to integrate with:

*   **2Captcha**
*   **Anti-Captcha**
*   **CapSolver**

## Solving a Captcha

To request a solution, send the captcha parameters (site key, URL) to the API.

```typescript
// 1. Detect the Captcha on the page (e.g. find sitekey)
const sitekey = await page.$eval('.g-recaptcha', el => el.getAttribute('data-sitekey'));

// 2. Request a specific solution type
const result = await client.captcha.solve({
    type: 'recaptcha_v2',
    sitekey: sitekey,
    url: page.url()
});

console.log(`Solved! Token: ${result.code}`);

// 3. Inject the token (Standard approach)
await page.evaluate((token) => {
    document.getElementById('g-recaptcha-response').innerHTML = token;
}, result.code);

// 4. Submit form
await page.click('#submit');
```

## API Reference

### `solve(params)`

*   `params.type`: The type of captcha (`recaptcha_v2`, `hcaptcha`, `turnstile`, etc.).
*   `params.sitekey`: The public key found on the target website.
*   `params.url`: The URL where the captcha is located.
*   `params.data`: (Optional) Additional data like `enterprise` flags or `userAgent`.
