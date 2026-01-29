# File Service

The file service transfers files between your local machine and a remote cloud browser — without needing cloud storage. Files are transferred directly through the browser's page context.

## Upload a File

Upload a file to a file input element on a page:

```typescript
const fileBuffer = fs.readFileSync('document.pdf');
await client.files.uploadToSession(session.id, fileBuffer, 'document.pdf');
```

How it works: The buffer is Base64-encoded, sent to the browser via `page.evaluate()`, decoded in the browser, and set on the file input element.

## Download a File

### Download from URL

```typescript
const result = await client.files.downloadFromSession(session.id, 'https://example.com/report.csv');
fs.writeFileSync('report.csv', result);
```

How it works: The browser fetches the URL, reads it with `FileReader`, converts to Base64, and returns it to Node.js.

### Download via Click

For files that can only be downloaded by clicking a button (not a direct URL), the service uses CDP's `Fetch.enable` to intercept the download.

## List Session Files

```typescript
const files = await client.sessions.files.list(session.id);
// Returns: FileInfo[]
```

## File Info

```typescript
interface FileInfo {
    path: string;
    name: string;
    size: number;
    createdAt: string;
    mimeType?: string;
}
```

## Session-Scoped File API

All file operations are available under `client.sessions.files`:

```typescript
// Upload
await client.sessions.files.upload(session.id, buffer, 'file.txt');

// List
const files = await client.sessions.files.list(session.id);

// Download
const data = await client.sessions.files.download(session.id, '/path/to/file');

// Download archive (all files)
const archive = await client.sessions.files.downloadArchive(session.id);

// Delete
await client.sessions.files.delete(session.id, '/path/to/file');

// Delete all
await client.sessions.files.deleteAll(session.id);
```

## Storage

Files are stored locally in a `.files/` directory organized by session ID.
