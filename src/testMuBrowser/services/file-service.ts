
import * as fs from 'fs-extra';
import * as path from 'path';
import { FileInfo } from '../types.js';

/**
 * FileService - File Management
 * 
 * Provides file upload, download, and management capabilities.
 * Supports both top-level file operations and session-scoped files.
 * 
 * Files are stored in:
 * - Top-level: .files/
 * - Session-scoped: .files/sessions/{sessionId}/
 */
export class FileService {
    private readonly filesDir: string;

    constructor() {
        this.filesDir = path.join(process.cwd(), '.files');
        fs.ensureDirSync(this.filesDir);
    }

    // ================== Top-level File Operations ==================

    /**
     * Upload a file
     */
    async upload(file: Buffer, filePath: string): Promise<FileInfo> {
        const fullPath = path.join(this.filesDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, file);

        const stats = await fs.stat(fullPath);
        return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            createdAt: stats.birthtime.toISOString()
        };
    }

    /**
     * List all files
     */
    async list(): Promise<FileInfo[]> {
        return this.listFilesRecursive(this.filesDir, '');
    }

    /**
     * Download a file
     */
    async download(filePath: string): Promise<Buffer> {
        const fullPath = path.join(this.filesDir, filePath);
        if (!await fs.pathExists(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFile(fullPath);
    }

    /**
     * Delete a file
     */
    async delete(filePath: string): Promise<void> {
        const fullPath = path.join(this.filesDir, filePath);
        if (await fs.pathExists(fullPath)) {
            await fs.remove(fullPath);
        }
    }

    // ================== Session-scoped File Operations ==================

    /**
     * Get session files directory
     */
    private getSessionDir(sessionId: string): string {
        return path.join(this.filesDir, 'sessions', sessionId);
    }

    /**
     * Upload a file to a session
     */
    async uploadToSession(sessionId: string, file: Buffer, filename: string): Promise<FileInfo> {
        const sessionDir = this.getSessionDir(sessionId);
        await fs.ensureDir(sessionDir);

        const fullPath = path.join(sessionDir, filename);
        await fs.writeFile(fullPath, file);

        const stats = await fs.stat(fullPath);
        return {
            path: `sessions/${sessionId}/${filename}`,
            name: filename,
            size: stats.size,
            createdAt: stats.birthtime.toISOString()
        };
    }

    /**
     * List files for a session
     */
    async listSessionFiles(sessionId: string): Promise<FileInfo[]> {
        const sessionDir = this.getSessionDir(sessionId);
        if (!await fs.pathExists(sessionDir)) {
            return [];
        }
        return this.listFilesRecursive(sessionDir, `sessions/${sessionId}`);
    }

    /**
     * Download a file from a session
     */
    async downloadFromSession(sessionId: string, filename: string): Promise<Buffer> {
        const fullPath = path.join(this.getSessionDir(sessionId), filename);
        if (!await fs.pathExists(fullPath)) {
            throw new Error(`File not found: ${filename}`);
        }
        return fs.readFile(fullPath);
    }

    /**
     * Delete a file from a session
     */
    async deleteFromSession(sessionId: string, filename: string): Promise<void> {
        const fullPath = path.join(this.getSessionDir(sessionId), filename);
        if (await fs.pathExists(fullPath)) {
            await fs.remove(fullPath);
        }
    }

    /**
     * Delete all files for a session
     */
    async deleteAllSessionFiles(sessionId: string): Promise<void> {
        const sessionDir = this.getSessionDir(sessionId);
        if (await fs.pathExists(sessionDir)) {
            await fs.remove(sessionDir);
        }
    }

    /**
     * Download all session files as a zip archive
     * Note: Requires archiver package for full implementation
     */
    async downloadSessionArchive(sessionId: string): Promise<Buffer> {
        const sessionDir = this.getSessionDir(sessionId);
        if (!await fs.pathExists(sessionDir)) {
            throw new Error(`No files found for session: ${sessionId}`);
        }

        // Simple implementation: return concatenated file list
        // For production, use 'archiver' package to create actual zip
        const files = await this.listSessionFiles(sessionId);

        // Placeholder: Return JSON manifest of files
        // TODO: Implement proper zip archive with 'archiver'
        const manifest = {
            sessionId,
            files: files.map(f => ({
                name: f.name,
                size: f.size,
                path: f.path
            }))
        };

        return Buffer.from(JSON.stringify(manifest, null, 2));
    }

    // ================== Helper Methods ==================

    /**
     * Recursively list files in a directory
     */
    private async listFilesRecursive(dir: string, prefix: string): Promise<FileInfo[]> {
        const files: FileInfo[] = [];

        if (!await fs.pathExists(dir)) {
            return files;
        }

        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
            const fullPath = path.join(dir, entry.name);

            if (entry.isFile()) {
                const stats = await fs.stat(fullPath);
                files.push({
                    path: relativePath,
                    name: entry.name,
                    size: stats.size,
                    createdAt: stats.birthtime.toISOString()
                });
            } else if (entry.isDirectory() && entry.name !== 'sessions') {
                // Recurse into subdirectories (but not the sessions dir from top-level)
                const subFiles = await this.listFilesRecursive(fullPath, relativePath);
                files.push(...subFiles);
            }
        }

        return files;
    }

    /**
     * Check if a file exists
     */
    async exists(filePath: string): Promise<boolean> {
        return fs.pathExists(path.join(this.filesDir, filePath));
    }

    /**
     * Get file info
     */
    async getInfo(filePath: string): Promise<FileInfo | null> {
        const fullPath = path.join(this.filesDir, filePath);
        if (!await fs.pathExists(fullPath)) {
            return null;
        }

        const stats = await fs.stat(fullPath);
        return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            createdAt: stats.birthtime.toISOString()
        };
    }
}
