# testMuBrowser SDK: Steel.dev Parity Review

This document is a comprehensive feature-by-feature analysis of `testMuBrowser` against the official Steel.dev Node SDK.

| ✅ = Implemented | ⚠️ = Partial/Mock | ❌ = Missing |

---

## 1. Sessions API (`client.sessions`)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `sessions.create(params)` | ✅ | Supports `local`, `stealth`, `profileId`, `tunnel`, `geoLocation`. |
| `sessions.retrieve(id)` | ❌ | Not implemented. Steel allows fetching session details by ID. |
| `sessions.list(params)` | ❌ | Not implemented. Steel allows listing all org sessions. |
| `sessions.release(id)` | ✅ | Releases session (closes local browser). |
| `sessions.releaseAll()` | ❌ | Not implemented. |
| `sessions.context(id)` | ❌ | Not implemented. (Fetches cookies/storage from running session) |
| `sessions.events(id)` | ❌ | Not implemented. (RRWeb replay events) |
| `sessions.liveDetails(id)` | ❌ | Not implemented. (Live browser state) |
| `sessions.computer(id, body)` | ❌ | Not implemented. (Claude Computer Use API) |

### Session Object Fields
| Steel Field | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `id` | ✅ | `session_<timestamp>` format. |
| `websocketUrl` | ✅ | CDP WebSocket for Puppeteer/Playwright. |
| `debugUrl` | ✅ | LambdaTest Dashboard URL. |
| `dimensions` | ❌ | Steel allows setting viewport. |
| `region` | ❌ | Steel supports `lax`, `ord`, `fra`, etc. |

---

## 2. Profiles API (`client.profiles`)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `profiles.create()` | ✅ | Creates empty profile JSON. |
| `profiles.list()` | ✅ | Lists profiles in `.profiles/`. |
| `profiles.retrieve(id)` | ❌ | Not implemented. |
| `profiles.delete(id)` | ❌ | Not implemented. |

### Profile Features
| Feature | testMuBrowser | Notes |
| :--- | :---: | :--- |
| Cookie Persistence | ✅ | Injected via CDP on connect, scraped on close. |
| LocalStorage Persistence | ✅ | Saved/Restored. |
| Fingerprint Storage | ❌ | Steel stores browser fingerprint in profile. |

---

## 3. Credentials API (`client.credentials`)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `credentials.create(body)` | ⚠️ | Mock in-memory implementation. |
| `credentials.update(body)` | ❌ | Not implemented. |
| `credentials.list()` | ❌ | Not implemented. |
| `credentials.delete(body)` | ❌ | Not implemented. |

---

## 4. Extensions API (`client.extensions`)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `extensions.upload(body)` | ✅ | Saves to `.extensions/`. |
| `extensions.list()` | ✅ | Lists files in `.extensions/`. |
| `extensions.update(id, body)` | ❌ | Not implemented. |
| `extensions.delete(id)` | ❌ | Not implemented. |
| `extensions.deleteAll()` | ❌ | Not implemented. |
| `extensions.download(id)` | ❌ | Not implemented. |

---

## 5. Files API (`client.files`)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `files.upload(sessionId, body)` | ✅ | Saves to `.files/<sessionId>/`. |
| `files.list(sessionId)` | ✅ | Lists uploaded files. |
| `files.download(sessionId, path)` | ✅ | Reads file content. |
| `files.delete(path)` | ❌ | Not implemented. |

---

## 6. Captchas API (`client.captcha`)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `captcha.solve(params)` | ⚠️ | Mock. Returns simulated token. |
| `captcha.getResult(id)` | ⚠️ | Mock. |

---

## 7. Quick Actions (Top-Level)

| Steel Method | testMuBrowser | Notes |
| :--- | :---: | :--- |
| `client.scrape(url, params)` | ✅ | Returns `{ title, content }`. |
| `client.screenshot(url, params)` | ✅ | Returns PNG Buffer. |
| `client.pdf(url, params)` | ✅ | Returns PDF Buffer. |

### Missing `ScrapeParams` Features
| Feature | testMuBrowser |
| :--- | :---: |
| `format: ['markdown', 'html']` | ❌ |
| `pdf: true` | ❌ |
| `screenshot: true` | ❌ |
| `delay` | ❌ |
| `region` | ❌ |
| `useProxy` | ❌ |

---

## 8. Framework Adapters

| Adapter | testMuBrowser |
| :--- | :---: |
| Puppeteer | ✅ + Stealth |
| Playwright | ✅ + Persistence |
| Selenium | ✅ (Scaffold) |

---

## 9. Infrastructure Features

| Feature | Steel | testMuBrowser | Notes |
| :--- | :---: | :---: | :--- |
| Managed Cloud | ✅ | ✅ (LT) | LambdaTest Grid. |
| Local Mode | ❌ | ✅ | Local Puppeteer. |
| Tunnel (Proxy) | ✅ | ✅ | `@lambdatest/node-tunnel`. |
| Geo-Location | ✅ | ✅ | LambdaTest `geoLocation` capability. |
| RegionlSelects | ✅ | ❌ | Steel has multi-region. |

---

## Summary: Completeness Score

| Category | Score |
| :--- | :--- |
| Sessions Core | **70%** (Missing list, retrieve, context) |
| Profiles Core | **60%** (Missing retrieve, delete) |
| Credentials | **20%** (Mock only) |
| Extensions | **40%** (Missing update/delete) |
| Files | **70%** (Missing delete) |
| Captchas | **30%** (Mock only) |
| Quick Actions | **50%** (Missing params) |
| **Overall API Parity** | **~55%** |

---

## Recommended Next Steps (Priority Order)

1.  **Session Lifecycle**: Implement `sessions.retrieve()`, `sessions.list()`, `sessions.context()`.
2.  **File/Extension Delete**: Add `files.delete()`, `extensions.delete()`.
3.  **Captcha Integration**: Replace mock with 2Captcha/Anti-Captcha real adapter.
4.  **Scrape Params**: Add `format`, `delay`, `region` support to `quick.scrape()`.
