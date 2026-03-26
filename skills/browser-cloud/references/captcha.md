# Captcha Solving

TestMu Cloud can automatically solve captchas encountered during browser automation.

## Requirement

An active session is required for captcha solving. The captcha must be present on the current page.

```bash
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer | jq -r '.data.id')
```

## Supported Captcha Types

| Type         | Flag value    | Notes                              |
|--------------|---------------|------------------------------------|
| reCAPTCHA v2 | `recaptcha`   | Checkbox and invisible variants    |
| reCAPTCHA v3 | `recaptcha`   | Score-based, solved automatically  |
| hCaptcha     | `hcaptcha`    | Common on Cloudflare-protected sites |
| Turnstile    | `turnstile`   | Cloudflare Turnstile challenge     |

## Solve Command

```bash
# Auto-detect captcha type
testmu-browser-cloud captcha solve --session <id>

# Specify captcha type explicitly
testmu-browser-cloud captcha solve --type recaptcha --session <id>
testmu-browser-cloud captcha solve --type hcaptcha --session <id>
testmu-browser-cloud captcha solve --type turnstile --session <id>
```

The command returns a task ID and waits for completion (or times out).

```json
{
  "taskId": "cap_abc123",
  "status": "solved",
  "token": "03AGdBq..."
}
```

## Status Command

Check the status of an in-progress captcha solve:

```bash
testmu-browser-cloud captcha status <taskId>
```

```json
{
  "taskId": "cap_abc123",
  "status": "solving"
}
```

Status values: `pending`, `solving`, `solved`, `failed`

## Example Workflow

```bash
SESSION_ID=$(testmu-browser-cloud session create --adapter puppeteer --stealth | jq -r '.data.id')

# Navigate to a page with a captcha
# (done via run command or SDK script)

# Solve the captcha
testmu-browser-cloud captcha solve --type recaptcha --session $SESSION_ID

# Continue with post-captcha actions
testmu-browser-cloud click 640 400 --session $SESSION_ID

# Cleanup
testmu-browser-cloud session release $SESSION_ID
```

## Notes

- Captcha solving is asynchronous; the `solve` command polls until resolved or timed out
- Stealth mode (`--stealth`) reduces the likelihood of encountering captchas in the first place
- Use `--type` when auto-detection is unreliable (e.g., embedded or custom implementations)
