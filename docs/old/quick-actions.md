# Quick Actions

Perform common browser tasks in a single line without managing a session connection manually. These actions spin up a transient (headless) local browser.

## Scrape

Extract title and content from a URL.

```typescript
const { title, content } = await client.scrape('https://example.com');
```

## Screenshot

Capture a screenshot (full page by default).

```typescript
const buffer = await client.screenshot('https://example.com');
fs.writeFileSync('screenshot.png', buffer);
```

## PDF

Generate a PDF of a page.

```typescript
const buffer = await client.pdf('https://example.com');
fs.writeFileSync('page.pdf', buffer);
```
