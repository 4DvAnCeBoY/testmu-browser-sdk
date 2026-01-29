
import * as fs from 'fs-extra';
import * as path from 'path';
import { Extension, ExtensionUploadResponse, ExtensionServiceConfig } from '../types.js';

/**
 * ExtensionService - Chrome Extension Management for LambdaTest Cloud
 *
 * Manages Chrome extensions that can be loaded into LambdaTest cloud browser sessions.
 *
 * How it works:
 * 1. User uploads extension ZIP file locally
 * 2. SDK uploads to LambdaTest cloud (gets S3 URL)
 * 3. S3 URL is used in session capabilities: lambda:loadExtension
 *
 * Usage:
 * ```typescript
 * const client = new testMuBrowser();
 *
 * // Configure with LT credentials
 * client.extensions.setConfig({
 *     username: process.env.LT_USERNAME,
 *     accessKey: process.env.LT_ACCESS_KEY
 * });
 *
 * // Upload extension (local + cloud)
 * const ext = await client.extensions.upload('./ublock.zip', { name: 'uBlock Origin' });
 * console.log(ext.cloudUrl); // https://automation-prod-user-files.s3.amazonaws.com/...
 *
 * // Create session with extension
 * const session = await client.sessions.create({
 *     extensionIds: [ext.id],
 *     lambdatestOptions: { ... }
 * });
 * ```
 */
export class ExtensionService {
    private config: ExtensionServiceConfig;
    private extensions: Map<string, Extension> = new Map();
    private initialized: boolean = false;

    constructor(config?: ExtensionServiceConfig) {
        this.config = {
            extensionsDir: config?.extensionsDir || process.env.TESTMU_EXTENSIONS_DIR || undefined,
            username: config?.username || process.env.LT_USERNAME,
            accessKey: config?.accessKey || process.env.LT_ACCESS_KEY,
            verbose: config?.verbose ?? true
        };
    }

    /**
     * Configure the extension service
     */
    setConfig(config: ExtensionServiceConfig): void {
        this.config = { ...this.config, ...config };
        this.initialized = false;
    }

    /**
     * Get the extensions directory path
     */
    getExtensionsDir(): string {
        return this.config.extensionsDir || path.join(process.cwd(), '.extensions');
    }

    /**
     * Ensure extensions directory exists
     */
    private async ensureDir(): Promise<void> {
        if (!this.initialized) {
            const dir = this.getExtensionsDir();
            await fs.ensureDir(dir);
            await this.loadExtensionsFromDisk();
            this.initialized = true;
            this.log(`Using extensions directory: ${dir}`);
        }
    }

    /**
     * Log message if verbose mode is enabled
     */
    private log(message: string): void {
        if (this.config.verbose) {
            console.log(`[ExtensionService] ${message}`);
        }
    }

    // ================== Core Extension Operations ==================

    /**
     * Upload an extension from a local ZIP file
     * Stores locally and uploads to LambdaTest cloud
     *
     * @param filePath - Path to extension ZIP file
     * @param options - Extension metadata
     */
    async upload(filePath: string, options?: {
        name?: string;
        description?: string;
        uploadToCloud?: boolean;
    }): Promise<ExtensionUploadResponse> {
        await this.ensureDir();

        // Read the file
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        if (!await fs.pathExists(absolutePath)) {
            throw new Error(`Extension file not found: ${absolutePath}`);
        }

        const fileBuffer = await fs.readFile(absolutePath);
        const filename = path.basename(filePath);
        const extensionId = `ext_${Date.now()}`;

        // Save locally
        const extensionDir = path.join(this.getExtensionsDir(), extensionId);
        await fs.ensureDir(extensionDir);
        const localFilePath = path.join(extensionDir, filename);
        await fs.writeFile(localFilePath, fileBuffer);

        // Create extension metadata
        const extension: Extension = {
            id: extensionId,
            name: options?.name || filename.replace(/\.(zip|crx)$/i, ''),
            version: '1.0.0',
            description: options?.description || '',
            enabled: true,
            createdAt: new Date().toISOString(),
            localPath: localFilePath
        };

        // Upload to LambdaTest cloud if credentials available
        let cloudUrl: string | undefined;
        const shouldUpload = options?.uploadToCloud !== false;

        if (shouldUpload && this.config.username && this.config.accessKey) {
            try {
                cloudUrl = await this.uploadToLambdaTest(localFilePath);
                extension.cloudUrl = cloudUrl;
                this.log(`Uploaded to LambdaTest cloud: ${cloudUrl}`);
            } catch (error: any) {
                this.log(`Warning: Cloud upload failed: ${error.message}`);
            }
        }

        // Save metadata
        await this.saveExtensionMetadata(extensionId, extension);
        this.extensions.set(extensionId, extension);

        this.log(`Extension uploaded: ${extension.name} (${extensionId})`);

        return {
            id: extensionId,
            name: extension.name,
            success: true,
            cloudUrl
        };
    }

    /**
     * Upload extension ZIP to LambdaTest cloud
     * Returns S3 URL for use in automation
     */
    /**
     * Upload extension to LambdaTest cloud using file path (matches curl behavior)
     */
    async uploadToLambdaTest(filePath: string): Promise<string> {
        if (!this.config.username || !this.config.accessKey) {
            throw new Error('LambdaTest credentials not configured');
        }

        const FormData = (await import('form-data')).default;
        const formData = new FormData();

        // Use a file stream (like curl's @"/path/to/file") instead of Buffer
        const fileStream = fs.createReadStream(filePath);
        formData.append('extensions', fileStream);

        const authString = Buffer.from(`${this.config.username}:${this.config.accessKey}`).toString('base64');

        const response = await fetch('https://api.lambdatest.com/automation/api/v1/files/extensions', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Authorization': `Basic ${authString}`,
                ...formData.getHeaders()
            },
            body: formData as any
        });

        const responseText = await response.text();
        this.log(`Upload response: ${response.status} - ${responseText}`);

        if (!response.ok) {
            throw new Error(`LambdaTest API error: ${response.status} - ${responseText}`);
        }

        let result: any;
        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(`Invalid JSON response: ${responseText}`);
        }

        // API returns: { data: [{ s3_url: "...", message: "...", error: "" }], status: "success" }
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            const entry = result.data[0];
            if (entry.error) {
                throw new Error(`LambdaTest upload error: ${entry.error}`);
            }
            if (entry.s3_url) {
                return entry.s3_url;
            }
        }

        // Fallback: check other possible response shapes
        if (result.data?.s3_url) {
            return result.data.s3_url;
        }

        throw new Error(`No S3 URL returned from LambdaTest API. Response: ${responseText}`);
    }

    /**
     * Get cloud URLs for extensions (for session creation)
     * @param extensionIds - Array of extension IDs
     */
    async getCloudUrls(extensionIds: string[]): Promise<string[]> {
        await this.ensureDir();

        const urls: string[] = [];
        for (const id of extensionIds) {
            const extension = this.extensions.get(id);
            if (extension?.cloudUrl) {
                urls.push(extension.cloudUrl);
            } else {
                this.log(`Warning: Extension '${id}' has no cloud URL`);
            }
        }
        return urls;
    }

    /**
     * Re-upload an existing extension to LambdaTest cloud
     * Use this if the extension was uploaded locally but cloud upload failed
     */
    async uploadToCloud(extensionId: string): Promise<string> {
        await this.ensureDir();

        const extension = this.extensions.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }

        if (!extension.localPath || !await fs.pathExists(extension.localPath)) {
            throw new Error(`Extension file not found: ${extension.localPath}`);
        }

        const cloudUrl = await this.uploadToLambdaTest(extension.localPath);

        // Update extension with cloud URL
        extension.cloudUrl = cloudUrl;
        await this.saveExtensionMetadata(extensionId, extension);
        this.extensions.set(extensionId, extension);

        this.log(`Extension uploaded to cloud: ${extensionId} -> ${cloudUrl}`);
        return cloudUrl;
    }

    /**
     * Register an extension that's already uploaded to LambdaTest cloud
     * Use this when you've manually uploaded the extension and have the S3 URL
     *
     * @param cloudUrl - S3 URL of the extension ZIP
     * @param options - Extension metadata
     */
    async registerCloudExtension(cloudUrl: string, options?: {
        name?: string;
        description?: string;
    }): Promise<Extension> {
        await this.ensureDir();

        const extensionId = `ext_${Date.now()}`;

        // Extract name from URL if not provided
        const urlFilename = cloudUrl.split('/').pop() || 'unknown';
        const name = options?.name || urlFilename.replace(/\.(zip|crx)$/i, '');

        const extension: Extension = {
            id: extensionId,
            name,
            version: '1.0.0',
            description: options?.description || '',
            enabled: true,
            createdAt: new Date().toISOString(),
            cloudUrl
        };

        // Save metadata
        const extensionDir = path.join(this.getExtensionsDir(), extensionId);
        await fs.ensureDir(extensionDir);
        await this.saveExtensionMetadata(extensionId, extension);
        this.extensions.set(extensionId, extension);

        this.log(`Registered cloud extension: ${name} (${extensionId}) → ${cloudUrl}`);

        return extension;
    }

    // ================== Extension Management ==================

    /**
     * List all extensions
     */
    async list(): Promise<Extension[]> {
        await this.ensureDir();
        return Array.from(this.extensions.values());
    }

    /**
     * Get extension by ID
     */
    async get(extensionId: string): Promise<Extension | null> {
        await this.ensureDir();
        return this.extensions.get(extensionId) || null;
    }

    /**
     * Check if extension exists
     */
    async exists(extensionId: string): Promise<boolean> {
        await this.ensureDir();
        return this.extensions.has(extensionId);
    }

    /**
     * Delete an extension
     */
    async delete(extensionId: string): Promise<boolean> {
        await this.ensureDir();

        const extensionDir = path.join(this.getExtensionsDir(), extensionId);
        if (await fs.pathExists(extensionDir)) {
            await fs.remove(extensionDir);
        }

        const deleted = this.extensions.delete(extensionId);
        if (deleted) {
            this.log(`Deleted extension: ${extensionId}`);
        }
        return deleted;
    }

    /**
     * Delete all extensions
     */
    async deleteAll(): Promise<number> {
        await this.ensureDir();

        const count = this.extensions.size;
        const dir = this.getExtensionsDir();

        const entries = await fs.readdir(dir);
        for (const entry of entries) {
            await fs.remove(path.join(dir, entry));
        }

        this.extensions.clear();
        this.log(`Deleted ${count} extensions`);
        return count;
    }

    /**
     * Enable/disable an extension
     */
    async setEnabled(extensionId: string, enabled: boolean): Promise<Extension> {
        await this.ensureDir();

        const extension = this.extensions.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }

        extension.enabled = enabled;
        await this.saveExtensionMetadata(extensionId, extension);
        this.extensions.set(extensionId, extension);

        this.log(`Extension ${extensionId} ${enabled ? 'enabled' : 'disabled'}`);
        return extension;
    }

    /**
     * Get all enabled extensions with cloud URLs
     */
    async getEnabledCloudUrls(): Promise<string[]> {
        await this.ensureDir();

        const urls: string[] = [];
        for (const extension of this.extensions.values()) {
            if (extension.enabled && extension.cloudUrl) {
                urls.push(extension.cloudUrl);
            }
        }
        return urls;
    }

    // ================== Helper Methods ==================

    /**
     * Load extensions from disk on startup
     */
    private async loadExtensionsFromDisk(): Promise<void> {
        try {
            const dir = this.getExtensionsDir();
            if (!await fs.pathExists(dir)) return;

            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const metadataPath = path.join(dir, entry.name, 'metadata.json');
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
        const metadataPath = path.join(this.getExtensionsDir(), extensionId, 'metadata.json');
        await fs.writeJson(metadataPath, extension, { spaces: 2 });
    }
}
