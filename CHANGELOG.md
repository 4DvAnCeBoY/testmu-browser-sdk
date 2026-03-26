# Changelog

All notable changes to testMuBrowser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Steel.dev SDK full API parity
- AI Agent computer actions (`sessions.computer()`) for mouse, keyboard, screenshot
- Session context management (`sessions.context()`) for cookies, localStorage, sessionStorage
- Session events recording (`sessions.events()`) in RRWeb format
- Live session details (`sessions.liveDetails()`)
- `sessions.releaseAll()` for bulk session cleanup
- Enhanced file service with session-scoped operations
- Extension management service (CRUD operations)
- Credential management service with URL matching
- Captcha solving integration (2Captcha/Anti-Captcha ready)
- Enhanced quick actions with delay, sessionId, format options
- Profile service with session context saving

### Changed
- Updated `SessionConfig` with full Steel.dev compatibility
- Enhanced `Session` type with dimensions, timeout, events
- Improved type exports in main index

### Fixed
- Cookie type compatibility with Puppeteer CookieParam

## [1.0.0] - 2026-01-26

### Added
- Initial release with Steel.dev compatibility layer
- Session management (create, list, retrieve, release)
- Puppeteer adapter with stealth mode
- Playwright adapter
- Selenium adapter
- Profile persistence (soft persistence)
- Quick actions (scrape, screenshot, pdf)
- File management service
- Extension loading support
- LambdaTest cloud integration
- Local browser support with Chrome auto-discovery
- Tunnel service for local development
- Comprehensive documentation (18 docs)
- 9 example scripts with real website automation

### Security
- Credential storage with secure handling
- Rate limiting on captcha requests

---

## Release Notes Format

Each release includes:
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes
