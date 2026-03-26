# Quick Actions: Scrape, Screenshot, PDF

Quick actions are one-liner operations that handle browser setup, navigation, and cleanup internally. You just provide a URL and get back the result.

## Scrape

Extract content from any webpage.

```typescript
// Simplest form
const result = await client.scrape('https://example.com');
console.log(result.content);

// With options
const result = await client.scrape({
    url: 'https://example.com',
    format: 'markdown',     // 'html' | 'markdown' | 'text' | 'readability'
    delay: 3000,             // Wait for JS-heavy pages
    waitFor: '#content',     // CSS selector to wait for
});
```

### Response

```typescript
interface ScrapeResponse {
    title: string;           // Page title
    content: string;         // Extracted content in requested format
    url: string;             // Final URL (after redirects)
    markdown?: string;       // Markdown version
    html?: string;           // Raw HTML
    metadata?: Record<string, string>; // Meta tags
}
```

### Formats

| Format | Description |
|--------|-------------|
| `html` | Raw HTML of the page |
| `text` | Plain text, stripped of tags |
| `readability` | Cleaned article content (like Reader Mode) |
| `markdown` | HTML converted to markdown |

## Screenshot

Capture a screenshot of any webpage.

```typescript
// Simplest form
const result = await client.screenshot('https://example.com');
fs.writeFileSync('screenshot.png', result.data);

// With options
const result = await client.screenshot({
    url: 'https://example.com',
    fullPage: true,          // Capture entire scrollable page
    format: 'jpeg',          // 'png' | 'jpeg' | 'webp'
    quality: 80,             // JPEG/WebP quality (1-100)
    delay: 2000,             // Wait before capture
});
```

### Response

```typescript
interface ScreenshotResponse {
    data: Buffer;            // Image binary data
    format: string;          // Image format
    width: number;           // Image width
    height: number;          // Image height
}
```

## PDF

Generate a PDF from any webpage.

```typescript
// Simplest form
const result = await client.pdf('https://example.com');
fs.writeFileSync('page.pdf', result.data);

// With options
const result = await client.pdf({
    url: 'https://example.com',
    format: 'A4',            // 'A4' | 'Letter' | 'Legal'
    landscape: false,
    printBackground: true,
    margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
    },
});
```

### Response

```typescript
interface PdfResponse {
    data: Buffer;            // PDF binary data
    pageCount: number;       // Number of pages
}
```

## How Quick Actions Work

Quick actions operate in two modes:

### Standalone Mode (Default)
Creates a temporary headless browser via `puppeteer-extra` with stealth, navigates to the URL, performs the operation, and closes the browser. Fully automatic.

### Session Mode
Uses an existing cloud session's browser. You register the page first:

```typescript
// Create session and connect
const session = await client.sessions.create({ ... });
const browser = await client.puppeteer.connect(session);
const page = (await browser.pages())[0];

// Register the page for quick actions
client.quick.registerSessionPage(session.id, page);

// Now scrape/screenshot/pdf use the existing session
const result = await client.scrape({
    url: 'https://example.com',
    sessionId: session.id,
});
```

This is useful when you need the browser to have specific cookies, a tunnel connection, or extensions loaded.
