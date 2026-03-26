# Adapters

Use `--adapter` on `session create` or `run` to choose the browser driver.

## Puppeteer

```bash
testmu-browser-cloud session create --adapter puppeteer
```

**Best for:**
- Web scraping and data extraction
- AI agents and vision-based automation
- Stealth browsing (pairs with `--stealth`)
- Chrome DevTools Protocol (CDP) use cases
- Performance-sensitive tasks (lighter overhead)

**Characteristics:**
- Chrome/Chromium only
- Native CDP support
- Fastest startup time
- Best stealth fingerprint coverage

## Playwright

```bash
testmu-browser-cloud session create --adapter playwright
```

**Best for:**
- Automated testing workflows
- Multi-browser scenarios (Chrome, Firefox, WebKit)
- Modern web apps with complex interactions
- Teams already using Playwright

**Characteristics:**
- Supports Chromium, Firefox, WebKit
- Rich selector engine (CSS, XPath, text, role)
- Built-in auto-wait and retry logic
- Best API ergonomics for test assertions

**LambdaTest browser names for Playwright:**
Use these exact `--browser-name` values with `--adapter playwright`:
- `chrome` — Google Chrome
- `MicrosoftEdge` — Microsoft Edge
- `pw-chromium` — Playwright Chromium
- `pw-firefox` — Firefox (NOT `Firefox`)
- `pw-webkit` — WebKit/Safari

**Common mistake:** Using `Firefox` or `Safari` as browser names. LambdaTest Playwright requires the `pw-` prefix for non-Chromium browsers.

## Selenium

```bash
testmu-browser-cloud session create --adapter selenium
```

**Best for:**
- Legacy test suites using Selenium WebDriver
- Cross-browser compatibility requirements
- Organizations with existing Selenium infrastructure
- Java, Python, Ruby, or .NET test ecosystems

**Characteristics:**
- WebDriver protocol (W3C standard)
- Broadest language binding support
- Compatible with Selenium Grid setups
- Slower than Puppeteer/Playwright

## Quick Comparison

| Criteria            | Puppeteer | Playwright | Selenium |
|---------------------|-----------|------------|----------|
| Stealth / scraping  | Best      | Good       | Poor     |
| Testing             | Good      | Best       | Good     |
| Multi-browser       | No        | Yes        | Yes      |
| Legacy support      | Poor      | Poor       | Best     |
| AI agent use        | Best      | Good       | Poor     |
| Speed               | Fastest   | Fast       | Slowest  |
