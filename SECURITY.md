# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously at testMuBrowser. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Open a Public Issue

Security vulnerabilities should not be reported through public GitHub issues to prevent exploitation before a fix is available.

### 2. Email Us Directly

Send an email to **security@lambdatest.com** with:

- **Subject**: `[SECURITY] testMuBrowser - Brief Description`
- **Description**: Detailed description of the vulnerability
- **Steps to Reproduce**: How to reproduce the issue
- **Impact**: What could an attacker do with this vulnerability?
- **Suggested Fix** (optional): If you have ideas on how to fix it

### 3. Encryption (Optional)

For sensitive reports, you may encrypt your message using our PGP key available at [https://lambdatest.com/.well-known/security.txt](https://lambdatest.com/.well-known/security.txt)

## Response Timeline

| Action | Timeline |
|--------|----------|
| Initial Response | Within 48 hours |
| Triage & Assessment | Within 7 days |
| Fix Development | Depends on severity |
| Public Disclosure | After fix is released |

## What We Consider Security Issues

- **Authentication bypass** or session hijacking
- **Credential exposure** in logs, errors, or storage
- **Remote code execution** vulnerabilities
- **Unsafe deserialization**
- **Path traversal** in file operations
- **Dependency vulnerabilities** (high/critical CVEs)

## What We Do NOT Consider Security Issues

- Issues requiring physical access
- Self-XSS or attacks requiring social engineering
- Denial of service via resource exhaustion (rate limiting is expected)
- Issues in dependencies with no exploitable path

## Recognition

We appreciate responsible disclosure. Security researchers who report valid vulnerabilities will be:

- Acknowledged in our release notes (if desired)
- Added to our Security Hall of Fame (coming soon)

## Scope

This security policy applies to:

- The `testmubrowser` npm package
- Official examples and documentation
- GitHub repository code

Third-party integrations (LambdaTest platform, AI providers) have their own security policies.

---

Thank you for helping keep testMuBrowser and its users safe! 🔐
