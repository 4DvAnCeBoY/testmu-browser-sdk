# testMuBrowser Examples

Examples demonstrating testMuBrowser SDK with **real website automation** on **LambdaTest cloud**.

## Prerequisites

```bash
# Set LambdaTest credentials
export LT_USERNAME=your_username
export LT_ACCESS_KEY=your_access_key

# Run any example
npx ts-node examples/local-demo.ts
```

---

## 📚 Examples

### 🤖 AI Agent Features

| Example | Real Websites | Description |
|---------|---------------|-------------|
| [ai-agent-computer-actions.ts](./ai-agent-computer-actions.ts) | DuckDuckGo, Google | Computer actions (click, type, scroll, screenshot) |
| [agent-with-local-llm.ts](./agent-with-local-llm.ts) | Hacker News | Integration with Ollama/local LLMs |

### 🔐 Session Management

| Example | Real Websites | Description |
|---------|---------------|-------------|
| [context-and-profiles.ts](./context-and-profiles.ts) | SauceDemo, Heroku | Session persistence, profile management |
| [steel-migration.ts](./steel-migration.ts) | SauceDemo, Heroku | Migration from Steel.dev SDK |

### ⚡ Quick Actions

| Example | Real Websites | Description |
|---------|---------------|-------------|
| [quick-actions-and-captcha.ts](./quick-actions-and-captcha.ts) | Hacker News, GitHub, HTTPBin | Scrape, screenshot, PDF, captcha |

### 🏢 Enterprise Features

| Example | Real Websites | Description |
|---------|---------------|-------------|
| [files-extensions-credentials.ts](./files-extensions-credentials.ts) | Heroku (upload/download/auth) | File, extension, credential management |

### 🔌 Adapter Demos

| Example | Real Websites | Description |
|---------|---------------|-------------|
| [local-demo.ts](./local-demo.ts) | bot.sannysoft.com, whatismybrowser | Local browser with stealth testing |
| [playwright-demo.ts](./playwright-demo.ts) | TodoMVC, SauceDemo | Playwright adapter with e-commerce |

### 📖 Complete Reference

| Example | Real Websites | Description |
|---------|---------------|-------------|
| [full-api-demo.ts](./full-api-demo.ts) | SauceDemo (full e-commerce flow) | **ALL APIs** in one file |

---

## 🌐 Real Websites Used

All examples use production websites for realistic automation:

- **E-commerce**: [SauceDemo](https://www.saucedemo.com) - Login, cart, checkout
- **Search**: [DuckDuckGo](https://duckduckgo.com), [Google](https://www.google.com)
- **News**: [Hacker News](https://news.ycombinator.com)
- **Testing Apps**: [Heroku Test Apps](https://the-internet.herokuapp.com), [TodoMVC](https://demo.playwright.dev/todomvc)
- **Bot Detection**: [bot.sannysoft.com](https://bot.sannysoft.com), [WhatIsMyBrowser](https://www.whatismybrowser.com)
- **APIs**: [HTTPBin](https://httpbin.org)

---

## 🔧 LambdaTest Configuration

```typescript
const session = await client.sessions.create({
  lambdatestOptions: {
    build: 'My Build',
    name: 'Test Name',
    platformName: 'Windows 11',
    browserName: 'Chrome',
    browserVersion: 'latest',
    'LT:Options': {
      username: process.env.LT_USERNAME,
      accessKey: process.env.LT_ACCESS_KEY,
      resolution: '1920x1080',
      video: true,
      console: true,
      network: true
    }
  }
});
```

View results at: **https://automation.lambdatest.com/**

---

## 🔌 Quick API Reference

```typescript
// Sessions
client.sessions.create(config)
client.sessions.computer(id, page, { action: 'click', coordinate: [x, y] })
client.sessions.context(id, page)
client.sessions.release(id)

// Quick Actions  
client.scrape({ url, delay?, format? })
client.screenshot({ url, fullPage? })
client.pdf({ url, format? })

// Services
client.files.upload(buffer, path)
client.credentials.create({ url, username, password })
client.profiles.saveProfile(id, page)
```
