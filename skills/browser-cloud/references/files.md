# File Operations

File commands transfer files between your local machine and the cloud browser session's filesystem.

## Upload

```bash
testmu-browser-cloud file upload <localPath> --session <id>
```

Uploads a local file to the cloud browser session. Useful for:
- Providing input data files to your script
- Uploading files to test file-upload forms in the browser
- Seeding test fixtures into the session environment

```bash
SESSION_ID=$(testmu-browser-cloud session create | jq -r '.data.id')
testmu-browser-cloud file upload ./data/input.csv --session $SESSION_ID
```

## Download

```bash
testmu-browser-cloud file download <remoteFile> --session <id> --output <localPath>
```

Downloads a file from the cloud browser session to your local machine. Useful for:
- Retrieving screenshots or PDFs generated inside a script
- Downloading files that the browser downloaded during a session
- Extracting exported data or reports

```bash
testmu-browser-cloud file download /downloads/report.pdf --session $SESSION_ID --output ./output/report.pdf
```

## List

```bash
testmu-browser-cloud file list --session <id>
```

Lists all files available in the session's file workspace.

```bash
testmu-browser-cloud file list --session $SESSION_ID
# Output: array of file names/paths in the session
```

## Delete

```bash
testmu-browser-cloud file delete <remoteFile> --session <id>
```

Deletes a file from the session filesystem.

```bash
testmu-browser-cloud file delete /downloads/temp.csv --session $SESSION_ID
```

## Supported Use Cases

| Use Case | Direction | Example |
|----------|-----------|---------|
| File upload form testing | local → cloud | Upload a PDF to test a form |
| Script input data | local → cloud | Upload CSV for data-driven tests |
| Screenshot retrieval | cloud → local | Download captures for review |
| Export/report extraction | cloud → local | Download generated PDFs |
| Test fixture seeding | local → cloud | Upload mock data files |

## Notes

- Files are scoped to the session — they are not shared across sessions
- Files are cleaned up automatically when a session is released
- Download files before releasing the session to avoid data loss
