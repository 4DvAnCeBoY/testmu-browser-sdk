
import * as fs from 'fs-extra';
import * as path from 'path';
import { Credential } from '../types.js';

/**
 * CredentialService - Credential Management
 * 
 * Manages stored credentials for automatic login functionality.
 * Credentials are matched by URL and can auto-submit login forms.
 * 
 * Storage: .credentials/credentials.json
 * 
 * Note: Credentials are stored in plain text. For production use,
 * implement encryption using a proper secret management solution.
 */
export class CredentialService {
    private readonly credentialsFile: string;
    private credentials: Map<string, Credential> = new Map();

    constructor() {
        const credentialsDir = path.join(process.cwd(), '.credentials');
        fs.ensureDirSync(credentialsDir);
        this.credentialsFile = path.join(credentialsDir, 'credentials.json');
        this.loadCredentials();
    }

    /**
     * Create a new credential
     */
    async create(params: {
        url: string;
        username: string;
        password: string;
    }): Promise<Credential> {
        const id = `cred_${Date.now()}`;
        const credential: Credential = {
            id,
            url: params.url,
            username: params.username,
            password: params.password,
            createdAt: new Date().toISOString()
        };

        this.credentials.set(id, credential);
        await this.saveCredentials();

        return credential;
    }

    /**
     * Update an existing credential
     */
    async update(id: string, params: Partial<Credential>): Promise<Credential> {
        const existing = this.credentials.get(id);
        if (!existing) {
            throw new Error(`Credential not found: ${id}`);
        }

        const updated: Credential = {
            ...existing,
            ...params,
            id, // Prevent ID change
            updatedAt: new Date().toISOString()
        };

        this.credentials.set(id, updated);
        await this.saveCredentials();

        return updated;
    }

    /**
     * List credentials, optionally filtered by URL
     */
    async list(url?: string): Promise<Credential[]> {
        const allCredentials = Array.from(this.credentials.values());

        if (url) {
            return allCredentials.filter(cred => this.urlMatches(cred.url, url));
        }

        // Return credentials without passwords for listing
        return allCredentials.map(cred => ({
            ...cred,
            password: '********'
        }));
    }

    /**
     * Get a specific credential by ID
     */
    async get(id: string): Promise<Credential | null> {
        return this.credentials.get(id) || null;
    }

    /**
     * Delete a credential
     */
    async delete(id: string): Promise<void> {
        this.credentials.delete(id);
        await this.saveCredentials();
    }

    /**
     * Delete all credentials
     */
    async deleteAll(): Promise<void> {
        this.credentials.clear();
        await this.saveCredentials();
    }

    /**
     * Find credentials matching a URL
     */
    async findForUrl(url: string): Promise<Credential | null> {
        for (const credential of this.credentials.values()) {
            if (this.urlMatches(credential.url, url)) {
                return credential;
            }
        }
        return null;
    }

    /**
     * Check if any credentials exist for a URL
     */
    async hasCredentialsFor(url: string): Promise<boolean> {
        return (await this.findForUrl(url)) !== null;
    }

    // ================== Helper Methods ==================

    /**
     * Check if stored URL matches the target URL
     */
    private urlMatches(storedUrl: string, targetUrl: string): boolean {
        try {
            const stored = new URL(storedUrl);
            const target = new URL(targetUrl);

            // Match origin (protocol + host)
            return stored.origin === target.origin;
        } catch {
            // Fall back to simple string comparison
            return targetUrl.includes(storedUrl) || storedUrl.includes(targetUrl);
        }
    }

    /**
     * Load credentials from disk
     */
    private async loadCredentials(): Promise<void> {
        try {
            if (await fs.pathExists(this.credentialsFile)) {
                const data = await fs.readJson(this.credentialsFile);
                if (Array.isArray(data)) {
                    for (const cred of data) {
                        this.credentials.set(cred.id, cred);
                    }
                }
            }
        } catch (e) {
            console.error('[CredentialService] Error loading credentials:', e);
        }
    }

    /**
     * Save credentials to disk
     */
    private async saveCredentials(): Promise<void> {
        try {
            const data = Array.from(this.credentials.values());
            await fs.writeJson(this.credentialsFile, data, { spaces: 2 });
        } catch (e) {
            console.error('[CredentialService] Error saving credentials:', e);
        }
    }
}
