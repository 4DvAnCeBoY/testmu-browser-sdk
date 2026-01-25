# Files API

The **Files API** allows you to manage file assets within your browser sessions. This is essential for:
1.  **Uploading**: Providing images for image-search, PDFs for parsing, or local HTML for testing.
2.  **Downloading**: Retrieving generated reports, invoices, or screenshots from the session.

## Architecture

In `testMuBrowser`, files are stored in a local directory structure (`.files/`) which mimics a cloud storage bucket.

```
.files/
   ├── <sessionId>/
   │     ├── uploaded-image.png
   │     └── downloaded-report.pdf
```

## Uploading files

To make a file available to the browser (e.g., for a file input field):

```typescript
import fs from 'fs';

// 1. Read the file into a buffer
const buffer = fs.readFileSync('./data/invoice.pdf');

// 2. Upload to the session
const session = await client.sessions.create();
const filePath = await client.files.upload(session.id, buffer, 'invoice.pdf');

console.log(`File available at: ${filePath}`);
```

### Using Uploaded Files (Puppeteer)

```typescript
const input = await page.$('input[type="file"]');
await input.uploadFile(filePath); // Puppeteer can access the local path directly
```

## Downloading Files

If the browser downloads a file (e.g., clicking a "Download" button), you can retrieve it via the API.

```typescript
// 1. Trigger the download
await page.click('#download-button');

// 2. Wait for download (handled by your script logic)
await new Promise(r => setTimeout(r, 2000));

// 3. List files in the session to find the name
const files = await client.files.list(session.id);
// Output: ['invoice.pdf', 'report_2023.csv']

// 4. Download content
const content = await client.files.download(session.id, 'report_2023.csv');
fs.writeFileSync('./downloads/report.csv', content);
```
