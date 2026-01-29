
import * as fs from 'fs-extra';
import * as path from 'path';
import { FileInfo } from '../types.js';
import { Page } from 'puppeteer-core';

/**
 * Configuration for FileService
 */
export interface FileServiceConfig {
    /** Directory to save downloaded files locally */
    downloadDir?: string;
    /** Enable verbose logging */
    verbose?: boolean;
}

/**
 * Downloaded file result
 */
export interface DownloadedFile {
    name: string;
    content: Buffer;
    size: number;
    localPath?: string;
}

/**
 * FileService - File Upload/Download for Remote Browser Sessions
 *
 * Simple file transfer between local machine and cloud browsers.
 * No cloud storage needed - files are transferred directly!
 *
 * UPLOAD (Local → Cloud Browser):
 *   Read file locally → Base64 → page.evaluate() → DataTransfer API
 *   Works with remote browsers (LambdaTest, BrowserStack, etc.)
 *
 * DOWNLOAD (Cloud Browser → Local):
 *   page.evaluate() + fetch() → Base64 → Node.js Buffer → Save locally
 *   OR: CDP Network Interception for downloads triggered by clicks
 *
 * Usage:
 * ```typescript
 * const client = new testMuBrowser();
 *
 * // Upload local file to remote browser's file input
 * await client.files.uploadToInput(page, 'input[type="file"]', './photo.png');
 *
 * // Download: click a download link, save file locally
 * const file = await client.files.download(page, async () => {
 *     await page.click('#download-btn');
 * });
 * // file.content is a Buffer, file.localPath is where it's saved
 * ```
 */
export class FileService {
    private config: FileServiceConfig;

    constructor(config?: FileServiceConfig) {
        this.config = {
            downloadDir: config?.downloadDir || process.env.TESTMU_DOWNLOAD_DIR || undefined,
            verbose: config?.verbose ?? true
        };
    }

    /**
     * Configure the file service
     */
    setConfig(config: FileServiceConfig): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get the download directory path
     */
    getDownloadDir(): string {
        return this.config.downloadDir || path.join(process.cwd(), 'downloads');
    }

    private log(message: string): void {
        if (this.config.verbose) {
            console.log(`[FileService] ${message}`);
        }
    }

    // ================== UPLOAD: Local → Remote Browser ==================

    /**
     * Upload a local file to a file input element in the remote browser
     *
     * Works with remote browsers (LambdaTest, BrowserStack) where
     * element.uploadFile() doesn't work because it sends paths, not content.
     *
     * Uses DataTransfer API to inject file content directly into the browser.
     *
     * @param page - Puppeteer page (can be remote)
     * @param selector - CSS selector for input[type="file"]
     * @param filePath - Local path to the file
     */
    async uploadToInput(page: Page, selector: string, filePath: string): Promise<void> {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

        if (!await fs.pathExists(absolutePath)) {
            throw new Error(`File not found: ${absolutePath}`);
        }

        // Read file and convert to Base64
        const fileBuffer = await fs.readFile(absolutePath);
        const base64Data = fileBuffer.toString('base64');
        const fileName = path.basename(filePath);
        const mimeType = this.getMimeType(fileName);

        // Inject file into browser using DataTransfer API
        await page.evaluate(
            ({ selector, base64Data, fileName, mimeType }) => {
                return new Promise<void>((resolve, reject) => {
                    try {
                        const input = document.querySelector(selector) as HTMLInputElement;
                        if (!input) {
                            reject(new Error(`Input element not found: ${selector}`));
                            return;
                        }

                        // Decode Base64 to binary
                        const binaryString = atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }

                        // Create File object
                        const file = new File([bytes], fileName, { type: mimeType });

                        // Use DataTransfer to set files on input
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        input.files = dataTransfer.files;

                        // Dispatch events so frameworks detect the change
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));

                        resolve();
                    } catch (err: any) {
                        reject(err);
                    }
                });
            },
            { selector, base64Data, fileName, mimeType }
        );

        this.log(`Uploaded ${fileName} (${fileBuffer.length} bytes) to ${selector}`);
    }

    // ================== DOWNLOAD: Remote Browser → Local ==================

    /**
     * Download a file by intercepting a network response
     *
     * Call this BEFORE triggering the download action.
     * It sets up CDP interception, then you trigger the download,
     * and it returns the file content.
     *
     * @param page - Puppeteer page
     * @param triggerAction - Async function that triggers the download (e.g., click a button)
     * @param options - Optional settings
     * @returns Downloaded file with content buffer
     */
    async download(page: Page, triggerAction: () => Promise<void>, options?: {
        /** Expected filename (optional, detected from headers) */
        filename?: string;
        /** Timeout in ms (default: 30000) */
        timeout?: number;
        /** Save to local disk automatically */
        saveToDisk?: boolean;
    }): Promise<DownloadedFile> {
        const timeout = options?.timeout || 30000;

        const client = await page.createCDPSession();

        return new Promise<DownloadedFile>(async (resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Download timeout after ${timeout}ms`));
            }, timeout);

            let cleaned = false;
            const cleanup = () => {
                if (cleaned) return;
                cleaned = true;
                clearTimeout(timer);
                client.send('Fetch.disable').catch(() => {});
            };

            try {
                // Enable request interception at response stage
                await client.send('Fetch.enable', {
                    patterns: [{
                        requestStage: 'Response'
                    }]
                });

                // Listen for intercepted responses
                client.on('Fetch.requestPaused', async (event: any) => {
                    const { requestId, responseHeaders, resourceType } = event;

                    // Check if this is a download (attachment or file types)
                    const contentDisposition = responseHeaders?.find(
                        (h: any) => h.name.toLowerCase() === 'content-disposition'
                    );
                    const contentType = responseHeaders?.find(
                        (h: any) => h.name.toLowerCase() === 'content-type'
                    );

                    const isDownload = contentDisposition?.value?.includes('attachment')
                        || resourceType === 'Document' && contentType?.value?.includes('application/');

                    if (isDownload || contentDisposition?.value?.includes('attachment')) {
                        try {
                            // Get response body
                            const response = await client.send('Fetch.getResponseBody', { requestId });
                            const body = response.base64Encoded
                                ? Buffer.from(response.body, 'base64')
                                : Buffer.from(response.body);

                            // Extract filename from Content-Disposition header
                            let filename = options?.filename || 'download';
                            if (contentDisposition?.value) {
                                const match = contentDisposition.value.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                                if (match && match[1]) {
                                    filename = match[1].replace(/['"]/g, '').trim();
                                }
                            }

                            // Continue the request (don't block the browser)
                            await client.send('Fetch.continueRequest', { requestId });

                            cleanup();

                            const result: DownloadedFile = {
                                name: filename,
                                content: body,
                                size: body.length
                            };

                            // Save to disk if requested
                            if (options?.saveToDisk !== false) {
                                const downloadDir = this.getDownloadDir();
                                await fs.ensureDir(downloadDir);
                                const localPath = path.join(downloadDir, filename);
                                await fs.writeFile(localPath, body);
                                result.localPath = localPath;
                                this.log(`Saved: ${localPath} (${body.length} bytes)`);
                            }

                            resolve(result);
                        } catch (err) {
                            // Continue the request even if we fail
                            await client.send('Fetch.continueRequest', { requestId }).catch(() => {});
                        }
                    } else {
                        // Not a download, continue normally
                        await client.send('Fetch.continueRequest', { requestId }).catch(() => {});
                    }
                });

                // Trigger the download action
                await triggerAction();

            } catch (err) {
                cleanup();
                reject(err);
            }
        });
    }

    /**
     * Download a file from a direct URL in the browser
     * Uses fetch() inside page.evaluate() to get the file content
     *
     * @param page - Puppeteer page
     * @param url - URL to download from
     * @param filename - Filename to save as (optional, extracted from URL)
     */
    async downloadFromUrl(page: Page, url: string, filename?: string): Promise<DownloadedFile> {
        const resolvedFilename = filename || path.basename(new URL(url).pathname) || 'download';

        // Fetch the file inside the browser and return as Base64
        const base64Content = await page.evaluate(async (downloadUrl: string) => {
            const response = await fetch(downloadUrl);
            const blob = await response.blob();

            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    // Remove "data:...;base64," prefix
                    const base64 = dataUrl.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(blob);
            });
        }, url);

        const content = Buffer.from(base64Content, 'base64');

        // Save to disk
        const downloadDir = this.getDownloadDir();
        await fs.ensureDir(downloadDir);
        const localPath = path.join(downloadDir, resolvedFilename);
        await fs.writeFile(localPath, content);

        this.log(`Downloaded from URL: ${resolvedFilename} (${content.length} bytes)`);

        return {
            name: resolvedFilename,
            content,
            size: content.length,
            localPath
        };
    }

    // ================== Helpers ==================

    /**
     * Get MIME type from filename
     */
    private getMimeType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.html': 'text/html',
            '.zip': 'application/zip',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // ================== Legacy methods (kept for backwards compatibility) ==================

    async upload(file: Buffer, filePath: string): Promise<FileInfo> {
        const dir = this.getDownloadDir();
        const fullPath = path.join(dir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, file);
        const stats = await fs.stat(fullPath);
        return { path: filePath, name: path.basename(filePath), size: stats.size, createdAt: stats.birthtime.toISOString() };
    }

    async list(): Promise<FileInfo[]> {
        const dir = this.getDownloadDir();
        if (!await fs.pathExists(dir)) return [];
        return this.listFilesRecursive(dir, '');
    }

    async uploadToSession(sessionId: string, file: Buffer, filename: string): Promise<FileInfo> {
        return this.upload(file, `sessions/${sessionId}/${filename}`);
    }

    async listSessionFiles(sessionId: string): Promise<FileInfo[]> {
        const dir = path.join(this.getDownloadDir(), 'sessions', sessionId);
        if (!await fs.pathExists(dir)) return [];
        return this.listFilesRecursive(dir, `sessions/${sessionId}`);
    }

    async downloadFromSession(sessionId: string, filename: string): Promise<Buffer> {
        const fullPath = path.join(this.getDownloadDir(), 'sessions', sessionId, filename);
        if (!await fs.pathExists(fullPath)) throw new Error(`File not found: ${filename}`);
        return fs.readFile(fullPath);
    }

    async deleteFromSession(sessionId: string, filename: string): Promise<void> {
        const fullPath = path.join(this.getDownloadDir(), 'sessions', sessionId, filename);
        if (await fs.pathExists(fullPath)) await fs.remove(fullPath);
    }

    async deleteAllSessionFiles(sessionId: string): Promise<void> {
        const dir = path.join(this.getDownloadDir(), 'sessions', sessionId);
        if (await fs.pathExists(dir)) await fs.remove(dir);
    }

    async downloadSessionArchive(sessionId: string): Promise<Buffer> {
        const files = await this.listSessionFiles(sessionId);
        return Buffer.from(JSON.stringify({ sessionId, files }, null, 2));
    }

    private async listFilesRecursive(dir: string, prefix: string): Promise<FileInfo[]> {
        const files: FileInfo[] = [];
        if (!await fs.pathExists(dir)) return files;
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                const stats = await fs.stat(fullPath);
                files.push({ path: relativePath, name: entry.name, size: stats.size, createdAt: stats.birthtime.toISOString() });
            } else if (entry.isDirectory()) {
                files.push(...await this.listFilesRecursive(fullPath, relativePath));
            }
        }
        return files;
    }
}
