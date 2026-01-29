# testMuBrowser SDK - Feature Summary

**Version:** 1.0.0 (MVP)
**Date:** January 2026
**Purpose:** A TypeScript SDK that provides a unified API for browser automation on LambdaTest cloud infrastructure and local browsers. Designed as a Steel.dev-compatible alternative built on LambdaTest.

---

## Table of Contents

1. [Sessions (Core)](#1-sessions-core)
2. [Quick Actions (Scrape / Screenshot / PDF)](#2-quick-actions)
3. [Context Service (Browser State Transfer)](#3-context-service)
4. [Profile Service (Persistent Browser Profiles)](#4-profile-service)
5. [File Service (Upload / Download)](#5-file-service)
6. [Extension Service (Chrome Extensions)](#6-extension-service)
7. [Tunnel Service (Local Network Access)](#7-tunnel-service)
8. [Features Not Yet Implemented](#8-features-not-yet-implemented)
9. [Architecture Overview](#9-architecture-overview)
10. [Comparison with Steel.dev](#10-comparison-with-steeldev)

---

## 1. Sessions (Core)

### What It Does
Sessions are the foundation of the SDK. A session represents a single cloud browser instance on LambdaTest (or a local browser). Everything else -- scraping, file uploads, extensions -- happens within a session.

### What We Provide
- **Create** a browser session on LambdaTest cloud or on the user's local machine
- **Connect** to the session using Puppeteer, Playwright, or Selenium
- **List** all active sessions
- **Release** (close) sessions individually or all at once
- **BYOB (Bring Your Own Browser)** -- connect to any browser via a custom WebSocket URL

### How a User Would Use It

```typescript
const client = new testMuBrowser();

// Create a cloud session on LambdaTest
const session = await client.sessions.create({
    adapter: 'puppeteer',
    lambdatestOptions: {
        platformName: 'Windows 10',
        browserName: 'Chrome',
        browserVersion: 'latest',
        'LT:Options': {
            username: 'my_username',
            accessKey: 'my_key'
        }
    }
});

// Connect and automate
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];
await page.goto('https://example.com');

// Done -- release
await browser.close();
await client.sessions.release(session.id);
```

### How It Works Internally
1. User calls `sessions.create()` with a config object.
2. The SDK generates a unique session ID.
3. For **cloud sessions**: The SDK builds a LambdaTest capabilities JSON (browser, OS, resolution, proxy, tunnel, extensions, etc.) and constructs a WebSocket URL pointing to `cdp.lambdatest.com`.
4. For **local sessions**: The SDK uses `chrome-launcher` to find and launch the user's local Chrome installation, then retrieves the WebSocket URL from Chrome's DevTools protocol.
5. For **BYOB**: The SDK uses whatever WebSocket URL the user provides.
6. The session object (with its WebSocket URL) is returned. The user passes this to `client.puppeteer.connect()` or `client.playwright.connect()` to get a browser instance.
7. On release, the SDK closes the browser connection and cleans up.

### Status: Working and Tested

---

## 2. Quick Actions

### What It Does
Quick Actions let users perform common tasks -- scraping, screenshots, PDF generation -- with a single function call. No need to create sessions, manage pages, or handle browser lifecycle. The SDK does it all behind the scenes.

### What We Provide

| Action | Description |
|--------|-------------|
| **Scrape** | Extract content from any URL in HTML, plain text, Markdown, or Readability format. Also extracts page title and metadata (description, og:image, etc.) |
| **Screenshot** | Capture a full-page or viewport screenshot of any URL. Supports PNG, JPEG, WebP formats with quality settings. |
| **PDF** | Generate a PDF from any URL. Supports A4/Letter/Legal page sizes, landscape/portrait, custom margins, and background printing. |

### How a User Would Use It

```typescript
const client = new testMuBrowser();

// Scrape a page
const result = await client.scrape('https://example.com');
console.log(result.content);  // HTML content
console.log(result.title);    // Page title

// Take a screenshot
const screenshot = await client.screenshot('https://example.com', true);
// Returns a PNG buffer

// Generate a PDF
const pdf = await client.pdf('https://example.com');
// Returns a PDF buffer
```

### How It Works Internally
1. The SDK launches a temporary headless Chrome browser using `puppeteer-extra` with the stealth plugin (to avoid bot detection).
2. It navigates to the target URL and waits for the page to fully load.
3. For **scrape**: Extracts `document.title`, meta tags, and the page HTML. Converts to the requested format (text, markdown, or readability).
4. For **screenshot**: Calls Puppeteer's `page.screenshot()` with the specified options.
5. For **PDF**: Calls Puppeteer's `page.pdf()` with format, margins, and orientation settings.
6. The temporary browser is closed automatically after the operation.
7. If the user has an active session, the SDK can use that session's page instead of launching a temporary browser.

### Status: Working and Tested

---

## 3. Context Service

### What It Does
The Context Service extracts and injects browser state -- cookies, localStorage, and sessionStorage -- across sessions. This enables users to perform an action once (like logging in or accepting a cookie banner) and replay that state in future sessions without repeating the action.

### What We Provide
- **Extract** all cookies, localStorage, and sessionStorage from a page
- **Inject** saved state into a new page/session
- **Clear** all browser state from a page
- **Framework agnostic** -- works with both Puppeteer and Playwright pages

### How a User Would Use It

**Real-world scenario: Skip cookie consent banners**

```typescript
const client = new testMuBrowser();

// Session 1: Accept cookies, save state
const session1 = await client.sessions.create({ ... });
const browser1 = await client.puppeteer.connect(session1);
const page1 = (await browser1.pages())[0];
await page1.goto('https://example.com');
// ... click "Accept Cookies" ...

// Save the browser state
const context = await client.context.getContext(page1);
// context contains: { cookies: [...], localStorage: {...}, sessionStorage: {...} }

// Session 2: Inject state, skip the cookie banner entirely
const session2 = await client.sessions.create({ ... });
const browser2 = await client.puppeteer.connect(session2);
const page2 = (await browser2.pages())[0];
await client.context.setCookies(page2, context.cookies);
await page2.goto('https://example.com');
// Cookie banner is gone -- the site remembers the user's choice
```

### How It Works Internally
1. **Get cookies**: The SDK auto-detects whether the page is Puppeteer or Playwright. For Puppeteer, it calls `page.cookies()`. For Playwright, it calls `page.context().cookies()`. Cookies are normalized to a common format.
2. **Get storage**: Uses `page.evaluate()` to iterate over `localStorage` and `sessionStorage` in the browser and return all key-value pairs. This works identically in both Puppeteer and Playwright.
3. **Set cookies**: For Puppeteer, calls `page.setCookie(...)`. For Playwright, calls `page.context().addCookies(...)`.
4. **Set storage**: Uses `page.evaluate()` to call `localStorage.setItem()` / `sessionStorage.setItem()` for each key-value pair. The page must be navigated to the correct origin first.
5. **Clear**: Uses CDP `Network.clearBrowserCookies` for Puppeteer, `context.clearCookies()` for Playwright, and `page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })` for storage.

### Status: Working and Tested

---

## 4. Profile Service

### What It Does
The Profile Service builds on top of the Context Service to provide **persistent, named browser profiles**. While the Context Service is the engine (get/set state), the Profile Service is the storage layer -- it saves browser state to disk as JSON files so it can be reused across script runs, not just across sessions within one run.

### What We Provide
- **Save** a page's browser state (cookies, localStorage, sessionStorage) to a named profile on disk
- **Load** a saved profile into any new page/session
- **Manage** profiles: create, list, get, delete, duplicate, export, import
- **Auto-save on close**: When using `profileId` in session config, the Puppeteer adapter automatically loads the profile on connect and saves it on browser close

### How a User Would Use It

```typescript
const client = new testMuBrowser();

// First run: Login and save state
const session = await client.sessions.create({ ... });
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];
await page.goto('https://app.example.com/login');
// ... perform login ...

await client.profiles.saveProfile('logged-in-user', page, {
    name: 'Production Login',
    description: 'Logged in as admin@example.com'
});
// Saved to .profiles/logged-in-user.json

// Second run (days later): Skip login entirely
const session2 = await client.sessions.create({ ... });
const browser2 = await client.puppeteer.connect(session2);
const page2 = (await browser2.pages())[0];

await client.profiles.loadProfile('logged-in-user', page2, {
    navigateFirst: 'https://app.example.com'
});
// Page now has all the cookies and storage from the login session
// User is already logged in
```

### How It Works Internally
1. **Save**: Calls the Context Service's `getContext()` to extract cookies, localStorage, and sessionStorage from the page. Wraps the data in a profile object with metadata (id, name, description, timestamps). Writes the JSON file to the `.profiles/` directory.
2. **Load**: Reads the profile JSON file from disk. If `navigateFirst` is specified, navigates the page first (required for localStorage). Uses the Context Service's `setContext()` to inject cookies and storage. The origin is determined dynamically from the current page URL.
3. **Storage**: Profiles are stored as individual JSON files in a configurable directory (default: `{project}/.profiles/`). The directory can also be set via the `TESTMU_PROFILES_DIR` environment variable.
4. **Auto-persistence**: When `profileId` is set in the session config, the Puppeteer adapter intercepts `browser.close()` and automatically calls `saveProfile()` before closing.

### Status: Working and Tested

---

## 5. File Service

### What It Does
The File Service enables file transfers between the user's local machine and a remote cloud browser. This solves a common problem: when the browser runs on LambdaTest's cloud, you cannot use local file paths for uploads or access downloaded files directly.

### What We Provide

| Operation | Description |
|-----------|-------------|
| **Upload to Input** | Upload a local file to a `<input type="file">` element in the remote browser |
| **Download from URL** | Fetch a file from a URL using the remote browser, transfer it to the local machine |
| **Download via Click** | Intercept a file download triggered by a button click in the remote browser |

### How a User Would Use It

```typescript
const client = new testMuBrowser();
client.files.setConfig({ downloadDir: './downloads' });

// Upload a local file to a remote browser's file input
await client.files.uploadToInput(page, 'input[type="file"]', './photo.png');
// The file input now has the file selected, ready to submit

// Download a file from a URL via the remote browser
const file = await client.files.downloadFromUrl(page, 'https://example.com/report.pdf');
console.log(file.localPath);  // ./downloads/report.pdf
console.log(file.size);       // 45230

// Download by clicking a link (intercepts the download)
const file = await client.files.download(page, async () => {
    await page.click('#download-btn');
});
console.log(file.localPath);  // ./downloads/filename.csv
```

### How It Works Internally

**Upload (Local to Cloud Browser):**
1. Reads the local file and encodes it as Base64.
2. Sends the Base64 string to the remote browser via `page.evaluate()`.
3. Inside the browser, decodes Base64 back to binary and creates a `File` object.
4. Uses the `DataTransfer` API to set the file on the target `<input>` element.
5. Dispatches `input` and `change` events so frameworks (React, Angular) detect the file selection.

**Download from URL (Cloud Browser to Local):**
1. Inside the remote browser, calls `fetch(url)` to download the file.
2. Converts the response to a Blob, then reads it as a Base64 data URL using `FileReader`.
3. Returns the Base64 string to Node.js via `page.evaluate()`.
4. Decodes Base64 to a Buffer and writes it to the local download directory.

**Download via Click (CDP Interception):**
1. Creates a CDP (Chrome DevTools Protocol) session.
2. Enables `Fetch.enable` to intercept network responses.
3. User triggers the download action (e.g., clicking a button).
4. The CDP listener catches responses with `Content-Disposition: attachment` headers.
5. Extracts the response body, converts to Buffer, and saves locally.
6. The request is continued so the browser behaves normally.

### Status: Working and Tested

---

## 6. Extension Service

### What It Does
The Extension Service manages Chrome extensions for LambdaTest cloud browser sessions. Extensions are loaded into the remote browser at session startup using LambdaTest's `lambda:loadExtension` capability.

### What We Provide
- **Register** a pre-uploaded extension by its cloud URL (S3 URL)
- **Manage** registered extensions: list, enable/disable, delete
- **Load** extensions into sessions using simple extension IDs
- **Direct URL** option for one-off usage without registration

### How a User Would Use It

**Option 1: Direct URL in session config**
```typescript
const session = await client.sessions.create({
    adapter: 'puppeteer',
    lambdatestOptions: {
        'LT:Options': {
            'lambda:loadExtension': [
                'https://s3-bucket.amazonaws.com/.../my-extension.zip'
            ]
        }
    }
});
// Browser launches with the extension installed
```

**Option 2: Register once, use by ID**
```typescript
// Register the extension (one-time setup)
const ext = await client.extensions.registerCloudExtension(
    'https://s3-bucket.amazonaws.com/.../ad-blocker.zip',
    { name: 'Ad Blocker' }
);

// Use by ID in any session
const session = await client.sessions.create({
    extensionIds: [ext.id],
    lambdatestOptions: { ... }
});
```

### How It Works Internally
1. **Register**: The user provides an S3 URL (obtained by uploading a ZIP to LambdaTest's extension API). The SDK generates an ID, stores the metadata (name, URL, enabled state) as a JSON file in the `.extensions/` directory, and keeps it in memory.
2. **Session creation**: When `extensionIds` are provided in the session config, the SDK's session manager calls `getCloudUrls()` to resolve IDs to S3 URLs. These URLs are added to the `lambda:loadExtension` capability in the LambdaTest session config.
3. **LambdaTest handling**: LambdaTest downloads the extension ZIP from S3, unpacks it, and installs it into the Chrome browser before the session starts. The extension is active on all pages.

**Uploading Extensions to LambdaTest (prerequisite):**
```bash
curl --location 'https://api.lambdatest.com/automation/api/v1/files/extensions' \
  --header 'Authorization: Basic <base64_credentials>' \
  --form 'extensions=@"./my-extension.zip"'
```
This returns an S3 URL that can be used with the SDK.

### Current Limitation
The automated upload from the SDK to LambdaTest's API is not yet working due to an API compatibility issue. For MVP, users upload extensions manually via curl and provide the URL to the SDK.

### Status: Partially Working (URL registration and loading works; automated upload pending)

---

## 7. Tunnel Service

### What It Does
The Tunnel Service creates an encrypted connection between the user's local network and LambdaTest's cloud browsers. This allows cloud browsers to access websites running on `localhost`, internal staging servers, or anything behind a firewall.

### What We Provide
- **Start** a LambdaTest tunnel with a single function call
- **Stop** the tunnel when done
- **Check** tunnel status
- **Auto-managed tunnels**: When `tunnel: true` is set in session config, the SDK starts a tunnel automatically

### How a User Would Use It

```typescript
const client = new testMuBrowser();

// Start tunnel
await client.tunnel.start({
    user: 'my_username',
    key: 'my_access_key',
    tunnelName: 'my-tunnel'
});

// Create session that uses the tunnel
const session = await client.sessions.create({
    tunnel: true,
    tunnelName: 'my-tunnel',
    lambdatestOptions: { ... }
});

const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

// Access localhost from the cloud browser
await page.goto('http://localhost:3000');

// Cleanup
await client.tunnel.stop();
```

### How It Works Internally
1. Uses the `@lambdatest/node-tunnel` package to establish an encrypted tunnel.
2. The tunnel runs as a background process that connects to LambdaTest's infrastructure.
3. When a session is created with `tunnel: true`, the SDK adds `tunnel: true` and the `tunnelName` to the LambdaTest capabilities.
4. LambdaTest's cloud browser routes traffic through the tunnel to reach the user's local network.
5. If `tunnel: true` is set in session config but no tunnel is running, the SDK auto-starts one.

### Status: Working and Tested

---

## 8. Features Not Yet Implemented

### Credentials Service
**What it would do:** Securely store and auto-fill login credentials for websites.

**Why not implemented for MVP:**
- Requires an encryption layer -- storing passwords in plain JSON is a security risk.
- Auto-fill logic (detecting login forms, filling username/password fields) is complex and varies across websites.
- Steel.dev does not offer this either, so it is not a competitive requirement.
- The Profile Service already handles the primary use case: login once, save cookies, reuse the session state.

**Plan for future:** Implement with OS keychain integration or AES encryption, add form auto-detection, and credential rotation support.

### Captcha Service
**What it would do:** Automatically detect and solve CAPTCHAs (reCAPTCHA, hCaptcha, Turnstile) during automation.

**Why not implemented for MVP:**
- Requires integration with paid third-party services (2Captcha, Anti-Captcha) which charge per solve.
- Each CAPTCHA type (reCAPTCHA v2, v3, hCaptcha, Cloudflare Turnstile) has different detection and solving logic.
- Cannot be tested reliably without real CAPTCHA API keys and real CAPTCHAs.
- LambdaTest already has some CAPTCHA handling via their stealth capabilities.

**Plan for future:** Integrate with 2Captcha/Anti-Captcha APIs, add auto-detection of CAPTCHA type, and inject solved tokens into the page automatically.

### Events Service
**What it would do:** Record browser session events in RRWeb format for playback and analysis.

**Why not implemented for MVP:**
- LambdaTest already records video of every cloud session, available in their dashboard.
- Building a parallel event recording system duplicates existing functionality.
- Only useful for custom replay UIs or analytics pipelines, which are niche use cases.

**Current state:** Basic stub exists with in-memory event storage. Can be extended if there is demand.

### Live Details
**What it would do:** Return detailed information about a running session (open tabs, URLs, browser version).

**Why not implemented for MVP:**
- LambdaTest dashboard already shows this information.
- Standard Puppeteer/Playwright APIs provide this directly (e.g., `page.url()`, `page.title()`, `browser.version()`).
- No real user demand for a separate service.

### Automated Extension Upload
**What it would do:** Allow the SDK to upload extension ZIP files directly to LambdaTest's cloud API.

**Why not fully working:**
- The LambdaTest API for extension upload (`/automation/api/v1/files/extensions`) returns 400 errors when the SDK sends the file via Node.js `form-data`. The same request works with `curl`.
- This appears to be a compatibility issue between Node.js `form-data` library and the API's expected multipart format.
- **Workaround for MVP:** Users upload extensions via curl and provide the S3 URL to the SDK.

**Plan for future:** Debug the API compatibility issue or use a different HTTP client library.

---

## 9. Architecture Overview

### SDK Structure

```
testMuBrowser (Main Class)
  |
  |-- sessions          → SessionManager (create, release, list sessions)
  |    |-- create()      → Local browser (chrome-launcher) or LambdaTest cloud
  |    |-- release()     → Close browser and cleanup
  |
  |-- puppeteer         → PuppeteerAdapter (connect to session via Puppeteer)
  |-- playwright        → PlaywrightAdapter (connect to session via Playwright)
  |-- selenium          → SeleniumAdapter (connect to session via Selenium)
  |
  |-- quick             → QuickActionsService (scrape, screenshot, pdf)
  |-- context           → ContextService (get/set cookies, storage)
  |-- profiles          → ProfileService (persistent browser state on disk)
  |-- files             → FileService (upload/download between local and cloud)
  |-- extensions        → ExtensionService (Chrome extension management)
  |-- tunnel            → TunnelService (LambdaTest tunnel)
  |-- credentials       → CredentialService (stub)
  |-- captcha           → CaptchaService (stub)
  |-- events            → EventsService (stub)
```

### Key Design Decisions

1. **Framework Agnostic:** The Context Service and Profile Service work with both Puppeteer and Playwright by auto-detecting the framework via `typeof page.context === 'function'` (Playwright pages have a `context()` method, Puppeteer pages do not).

2. **No Cloud Storage for Files:** The File Service transfers files directly between the local machine and remote browser using Base64 encoding through `page.evaluate()`. No intermediate cloud storage is needed.

3. **Lazy Initialization:** Services like ProfileService and ExtensionService initialize their storage directories only when first used, not at SDK startup.

4. **Steel.dev API Compatibility:** The SDK's method names and signatures are designed to match Steel.dev's API where possible, making migration straightforward.

### Dependencies

| Package | Purpose |
|---------|---------|
| `puppeteer-core` | Browser automation engine |
| `puppeteer-extra` + `stealth` | Anti-bot detection for quick actions |
| `playwright-core` | Alternative browser automation engine |
| `chrome-launcher` | Auto-discover and launch local Chrome |
| `@lambdatest/node-tunnel` | Encrypted tunnel to LambdaTest |
| `fs-extra` | Enhanced file system operations |

### Session Execution Modes

| Mode | How It Works |
|------|-------------|
| **LambdaTest Cloud** | SDK constructs a WebSocket URL with capabilities and connects to `cdp.lambdatest.com`. Browser runs on LambdaTest infrastructure. |
| **Local Browser** | SDK uses `chrome-launcher` to find and launch Chrome locally, then connects via the local WebSocket URL. |
| **BYOB** | User provides any WebSocket URL. SDK connects to it directly. Useful for custom setups or other cloud providers. |

---

## Feature Readiness Summary

| Feature | Status | Tested | Notes |
|---------|--------|--------|-------|
| Sessions (Cloud + Local) | Ready | Yes | Full lifecycle working |
| Quick Actions (Scrape/Screenshot/PDF) | Ready | Yes | Standalone and session-based |
| Context Service | Ready | Yes | Puppeteer + Playwright |
| Profile Service | Ready | Yes | Persistent disk storage |
| File Service (Upload/Download) | Ready | Yes | Direct transfer, no cloud storage |
| Extension Service | Partial | Yes | URL registration works; automated upload pending |
| Tunnel Service | Ready | Yes | Auto-managed tunnels |
| Credentials Service | Stub | No | Deferred -- needs encryption |
| Captcha Service | Stub | No | Deferred -- needs 3rd-party API |
| Events Service | Stub | No | Low priority -- LambdaTest has video |

---

## 10. Comparison with Steel.dev

Steel.dev is a cloud-based browser automation platform offering a REST API and SDKs (TypeScript, Python) for AI agents and browser automation. Below is a feature-by-feature comparison.

### Feature Comparison Table

| Feature | Steel.dev | testMuBrowser | Notes |
|---------|-----------|---------------|-------|
| **Sessions** | Cloud-hosted browser sessions via Steel's own infrastructure | Cloud (LambdaTest) + Local browser + BYOB | testMuBrowser offers more flexibility: run on LambdaTest cloud, local Chrome, or any custom browser via WebSocket URL. Steel only runs on their own cloud. |
| **Scrape** | `/v1/scrape` endpoint, HTML extraction | `client.scrape()` with HTML, text, markdown, readability formats | testMuBrowser supports more output formats. Both work as single-call APIs. |
| **Screenshot** | `/v1/screenshot` endpoint | `client.screenshot()` with PNG/JPEG/WebP, quality control | Feature parity. Both support full-page capture. |
| **PDF** | `/v1/pdf` endpoint | `client.pdf()` with page size, margins, orientation | Feature parity. Both generate PDFs from URLs. |
| **Context (Cookies/Storage)** | Session context with cookies and localStorage, injected at session creation | `client.context` service with get/set/clear for cookies, localStorage, sessionStorage | testMuBrowser provides more granular control -- get/set/clear individual storage types. Steel injects context only at session creation time. |
| **Profiles** | Profiles API -- reuse browser context, auth, cookies, extensions, credentials across sessions | `client.profiles` service -- save/load/manage persistent profiles on disk | Steel stores profiles on their cloud. testMuBrowser stores locally as JSON files with export/import. Steel's profiles can bundle extensions and credentials; testMuBrowser profiles store browser state only. |
| **Files** | Files API -- upload/download/manage files within sessions (Steel's cloud storage) | `client.files` service -- direct transfer between local machine and remote browser | Different approach. Steel uses cloud storage as intermediary. testMuBrowser transfers directly via Base64 through `page.evaluate()` -- no cloud storage needed. |
| **Extensions** | Extensions API -- add Chrome extensions to sessions | `client.extensions` service -- register cloud URLs, load via `lambda:loadExtension` | Both load extensions into cloud browsers. Steel handles upload internally. testMuBrowser currently requires manual upload via curl, then registers the URL. |
| **Credentials** | Credentials API -- programmatic credential storage for agents | Stub only | Steel has a working credentials API. testMuBrowser deferred this for MVP. |
| **Captcha** | Integrated captcha solvers -- auto-detect and solve reCAPTCHA, hCaptcha, etc. | Stub only | Steel has built-in captcha solving. testMuBrowser deferred this -- would require 3rd-party service integration. |
| **Tunnel / Local Access** | Not offered | `client.tunnel` service -- encrypted tunnel to access localhost from cloud | testMuBrowser advantage. Steel has no equivalent; their browsers cannot access the user's local network. |
| **Anti-Detection / Stealth** | Built-in stealth plugins and fingerprint management | Uses `puppeteer-extra-plugin-stealth` for quick actions | Both have anti-bot measures. Steel's is more deeply integrated. testMuBrowser relies on the stealth plugin and LambdaTest's own anti-detection. |
| **Mobile Mode** | Create sessions that appear as mobile devices with full mobile fingerprints | Not offered | Steel advantage. testMuBrowser does not have mobile device emulation. |
| **Live Session Viewer** | Built-in UI to view and debug live sessions; embeddable in apps | LambdaTest dashboard provides session video and debugging | Steel's viewer is embeddable in the user's own app. LambdaTest's dashboard is separate but provides video recordings and logs. |
| **Human-in-the-Loop** | Let users take manual control of automated sessions | Not offered | Steel advantage. Useful for AI agent workflows where a human needs to intervene. |
| **Session Recordings** | Access recordings of completed sessions | LambdaTest provides video recordings via dashboard | Both offer recordings, but through different mechanisms. |
| **Multi-Region** | Control which region hosts the session | LambdaTest supports geo-location and region settings | Feature parity through different mechanisms. |
| **Proxy Support** | Per-session proxy configuration | Per-session proxy via LambdaTest capabilities | Feature parity. |
| **Framework Support** | Puppeteer, Playwright, Selenium | Puppeteer, Playwright, Selenium | Feature parity. |
| **AI Agent Integrations** | Claude, OpenAI, Gemini Computer Use, Browser-Use, CrewAI, Stagehand | Computer Service for coordinate-based actions (internal) | Steel has more pre-built integrations with AI frameworks. |

### Where testMuBrowser Has an Advantage

1. **Tunnel / Local Network Access** -- Steel cannot access the user's localhost or internal networks. testMuBrowser can, via LambdaTest tunnels. This is critical for testing staging environments or local development servers.

2. **Execution Flexibility** -- testMuBrowser runs on LambdaTest cloud, local Chrome, or any custom WebSocket browser. Steel only runs on their own infrastructure. Users are not locked into a single provider.

3. **No Cloud Storage Dependency for Files** -- testMuBrowser transfers files directly between local machine and remote browser. No intermediate cloud storage, no extra API calls, no storage costs.

4. **Granular Context Control** -- testMuBrowser lets users get/set/clear cookies, localStorage, and sessionStorage independently, at any point during the session. Steel only injects context at session creation.

5. **LambdaTest Infrastructure** -- Access to LambdaTest's existing infrastructure: 3000+ browser/OS combinations, parallel test execution, CI/CD integrations, and enterprise support.

### Where Steel.dev Has an Advantage

1. **Captcha Solving** -- Steel has built-in captcha solvers that auto-detect and solve CAPTCHAs. testMuBrowser has this as a stub only.

2. **Credentials API** -- Steel offers programmatic credential storage. testMuBrowser deferred this feature.

3. **Mobile Mode** -- Steel can create sessions that fully emulate mobile devices with proper fingerprints. testMuBrowser does not offer this.

4. **Human-in-the-Loop** -- Steel lets users take manual control of automated sessions mid-flow. Useful for AI agent scenarios where human intervention is needed.

5. **AI Framework Integrations** -- Steel has pre-built integrations with Claude, OpenAI, Gemini Computer Use, Browser-Use, CrewAI, and others. testMuBrowser would need custom integration work.

6. **Extension Upload** -- Steel handles extension upload internally through their API. testMuBrowser requires manual upload via curl as a prerequisite.

### Summary

testMuBrowser provides **feature parity with Steel.dev on the core automation features** (sessions, scrape, screenshot, PDF, context, profiles, files, extensions) while adding **unique capabilities** that Steel lacks (tunnel access, local browser support, BYOB, direct file transfer). Steel's advantages are primarily in **AI-specific features** (captcha solving, human-in-the-loop, mobile mode) and **managed infrastructure** (no need to manage LambdaTest credentials separately).

For teams already using LambdaTest or needing access to local networks, testMuBrowser is the stronger choice. For teams building AI agents that need captcha solving and mobile emulation out of the box, Steel currently has more built-in capabilities in those areas.
