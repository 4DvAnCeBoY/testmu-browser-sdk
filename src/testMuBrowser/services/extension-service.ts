
import * as fs from 'fs-extra';
import * as path from 'path';
import { Extension, ExtensionUploadResponse } from '../types.js';

/**
 * ExtensionService - Chrome Extension Management
 * 
 * Manages Chrome extensions that can be loaded into browser sessions.
 * Extensions are stored as unpacked extension directories or CRX files.
 * 
 * Storage: .extensions/
 */
export class ExtensionService {
    private readonly extensionsDir: string;
    private extensions: Map<string, Extension> = new Map();

    constructor() {
        this.extensionsDir = path.join(process.cwd(), '.extensions');
        fs.ensureDirSync(this.extensionsDir);
        this.loadExtensionsFromDisk();
    }

    /**
     * Upload a new extension
     * Accepts CRX file or zip of unpacked extension
     */
    async upload(file: Buffer, filename: string): Promise<ExtensionUploadResponse> {
        const extensionId = `ext_${Date.now()}`;
        const extensionDir = path.join(this.extensionsDir, extensionId);

        await fs.ensureDir(extensionDir);

        // Save the extension file
        const filePath = path.join(extensionDir, filename);
        await fs.writeFile(filePath, file);

        // Parse extension name from filename
        const name = filename.replace(/\.(crx|zip)$/, '');

        // Create extension metadata
        const extension: Extension = {
            id: extensionId,
            name,
            version: '1.0.0',
            description: '',
            enabled: true,
            createdAt: new Date().toISOString()
        };

        // Try to read manifest.json if it's an unpacked extension
        const manifestPath = path.join(extensionDir, 'manifest.json');
        if (await fs.pathExists(manifestPath)) {
            try {
                const manifest = await fs.readJson(manifestPath);
                extension.name = manifest.name || name;
                extension.version = manifest.version || '1.0.0';
                extension.description = manifest.description || '';
            } catch (e) {
                // Ignore manifest parsing errors
            }
        }

        // Save metadata
        await this.saveExtensionMetadata(extensionId, extension);
        this.extensions.set(extensionId, extension);

        return {
            id: extensionId,
            name: extension.name,
            success: true
        };
    }

    /**
     * List all extensions
     */
    async list(): Promise<Extension[]> {
        return Array.from(this.extensions.values());
    }

    /**
     * Get extension by ID
     */
    async get(extensionId: string): Promise<Extension | null> {
        return this.extensions.get(extensionId) || null;
    }

    /**
     * Download extension files
     */
    async download(extensionId: string): Promise<string> {
        const extensionDir = path.join(this.extensionsDir, extensionId);
        if (!await fs.pathExists(extensionDir)) {
            throw new Error(`Extension not found: ${extensionId}`);
        }
        return extensionDir;
    }

    /**
     * Update extension metadata
     */
    async update(extensionId: string, params: Partial<Extension>): Promise<Extension> {
        const extension = this.extensions.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }

        const updated: Extension = {
            ...extension,
            ...params,
            id: extensionId // Prevent ID change
        };

        await this.saveExtensionMetadata(extensionId, updated);
        this.extensions.set(extensionId, updated);

        return updated;
    }

    /**
     * Delete an extension
     */
    async delete(extensionId: string): Promise<void> {
        const extensionDir = path.join(this.extensionsDir, extensionId);
        if (await fs.pathExists(extensionDir)) {
            await fs.remove(extensionDir);
        }
        this.extensions.delete(extensionId);
    }

    /**
     * Delete all extensions
     */
    async deleteAll(): Promise<void> {
        const entries = await fs.readdir(this.extensionsDir);
        for (const entry of entries) {
            const fullPath = path.join(this.extensionsDir, entry);
            await fs.remove(fullPath);
        }
        this.extensions.clear();
    }

    /**
     * Enable/disable an extension
     */
    async setEnabled(extensionId: string, enabled: boolean): Promise<Extension> {
        return this.update(extensionId, { enabled });
    }

    /**
     * Get extension paths for session launch
     * Returns paths of all enabled extensions
     */
    async getEnabledExtensionPaths(): Promise<string[]> {
        const paths: string[] = [];

        for (const [id, extension] of this.extensions) {
            if (extension.enabled) {
                const extPath = path.join(this.extensionsDir, id);
                if (await fs.pathExists(extPath)) {
                    paths.push(extPath);
                }
            }
        }

        return paths;
    }

    /**
     * Get extension paths by IDs
     */
    async getExtensionPathsByIds(ids: string[]): Promise<string[]> {
        const paths: string[] = [];

        // Handle special 'all_ext' value
        if (ids.includes('all_ext')) {
            return this.getEnabledExtensionPaths();
        }

        for (const id of ids) {
            const extPath = path.join(this.extensionsDir, id);
            if (await fs.pathExists(extPath)) {
                paths.push(extPath);
            }
        }

        return paths;
    }

    // ================== Helper Methods ==================

    /**
     * Load extensions from disk on startup
     */
    private async loadExtensionsFromDisk(): Promise<void> {
        try {
            const entries = await fs.readdir(this.extensionsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const metadataPath = path.join(this.extensionsDir, entry.name, 'metadata.json');
                    if (await fs.pathExists(metadataPath)) {
                        try {
                            const metadata = await fs.readJson(metadataPath);
                            this.extensions.set(entry.name, metadata);
                        } catch (e) {
                            // Ignore invalid metadata
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    /**
     * Save extension metadata to disk
     */
    private async saveExtensionMetadata(extensionId: string, extension: Extension): Promise<void> {
        const metadataPath = path.join(this.extensionsDir, extensionId, 'metadata.json');
        await fs.writeJson(metadataPath, extension, { spaces: 2 });
    }
}
