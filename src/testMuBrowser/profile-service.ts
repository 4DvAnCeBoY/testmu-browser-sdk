
import * as fs from 'fs-extra';
import * as path from 'path';
import { SessionContext, Cookie, ProfileData } from './types.js';
import { ContextService } from './services/context-service.js';

/**
 * Profile data structure
 * Stores browser state: cookies, localStorage, sessionStorage
 */
export interface Profile {
    id: string;
    name?: string;
    description?: string;
    cookies: Cookie[];
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

/**
 * Profile service configuration
 */
export interface ProfileServiceConfig {
    /**
     * Directory to store profiles
     * Default: process.cwd() + '/.profiles'
     * Can also be set via TESTMU_PROFILES_DIR environment variable
     */
    profilesDir?: string;

    /**
     * Whether to log profile operations
     * Default: true
     */
    verbose?: boolean;
}

/**
 * ProfileService - Browser Profile Management for Deployed SDK
 *
 * Manages persistent browser profiles for session state.
 * Profiles store cookies, localStorage, and sessionStorage.
 *
 * Storage location (in order of priority):
 * 1. Configured via setConfig({ profilesDir: '/path' })
 * 2. Environment variable: TESTMU_PROFILES_DIR
 * 3. Default: {user's project}/.profiles/
 *
 * Usage:
 * ```typescript
 * const client = new testMuBrowser();
 *
 * // Optional: Configure custom profiles directory
 * client.profiles.setConfig({ profilesDir: './my-profiles' });
 *
 * // Save browser state to profile
 * await client.profiles.saveProfile('logged-in-user', page);
 *
 * // Load profile into new session
 * await client.profiles.loadProfile('logged-in-user', page);
 * ```
 */
export class ProfileService {
    private contextService: ContextService;
    private config: ProfileServiceConfig;
    private initialized: boolean = false;

    constructor(config?: ProfileServiceConfig) {
        this.contextService = new ContextService();
        this.config = {
            profilesDir: config?.profilesDir || process.env.TESTMU_PROFILES_DIR || undefined,
            verbose: config?.verbose ?? true
        };
    }

    /**
     * Configure the profile service
     * Call this before using profiles if you need custom settings
     */
    setConfig(config: ProfileServiceConfig): void {
        this.config = { ...this.config, ...config };
        this.initialized = false; // Reset to reinitialize with new config
    }

    /**
     * Get the profiles directory path
     */
    getProfilesDir(): string {
        return this.config.profilesDir || path.join(process.cwd(), '.profiles');
    }

    /**
     * Ensure profiles directory exists (lazy initialization)
     */
    private async ensureDir(): Promise<void> {
        if (!this.initialized) {
            const dir = this.getProfilesDir();
            await fs.ensureDir(dir);
            this.initialized = true;
            if (this.config.verbose) {
                console.log(`[ProfileService] Using profiles directory: ${dir}`);
            }
        }
    }

    /**
     * Get file path for a profile
     */
    private getProfilePath(id: string): string {
        return path.join(this.getProfilesDir(), `${id}.json`);
    }

    /**
     * Log message if verbose mode is enabled
     */
    private log(message: string): void {
        if (this.config.verbose) {
            console.log(`[ProfileService] ${message}`);
        }
    }

    // ================== Core Profile Operations ==================

    /**
     * Load a profile into a page (inject cookies, localStorage, sessionStorage)
     *
     * @param id - Profile ID
     * @param page - Puppeteer page (can be from LambdaTest cloud session)
     * @param options - Optional settings
     */
    async loadProfile(id: string, page: any, options?: {
        /** Navigate to a URL before injecting (required for localStorage) */
        navigateFirst?: string;
        /** Only load cookies, skip storage */
        cookiesOnly?: boolean;
    }): Promise<boolean> {
        await this.ensureDir();

        const filePath = this.getProfilePath(id);
        if (!await fs.pathExists(filePath)) {
            this.log(`Profile '${id}' not found at ${filePath}`);
            return false;
        }

        try {
            const profile: Profile = await fs.readJson(filePath);

            // Navigate first if specified (needed for localStorage/sessionStorage)
            if (options?.navigateFirst) {
                await page.goto(options.navigateFirst, { waitUntil: 'domcontentloaded' });
            }

            if (options?.cookiesOnly) {
                // Only load cookies
                await this.contextService.setCookies(page, profile.cookies);
                this.log(`Loaded cookies from profile '${id}' (${profile.cookies.length} cookies)`);
            } else {
                // Get the current page origin to use as key for localStorage/sessionStorage
                const currentOrigin = await page.evaluate(() => window.location.origin);

                // Load full context - use current origin so setContext can match it
                const context: SessionContext = {
                    cookies: profile.cookies,
                    localStorage: { [currentOrigin]: profile.localStorage },
                    sessionStorage: { [currentOrigin]: profile.sessionStorage }
                };
                await this.contextService.setContext(page, context);
                this.log(`Loaded profile '${id}' (${profile.cookies.length} cookies, localStorage, sessionStorage)`);
            }

            return true;
        } catch (error: any) {
            this.log(`Error loading profile '${id}': ${error.message}`);
            return false;
        }
    }

    /**
     * Save page state to a profile
     *
     * @param id - Profile ID (will create or update)
     * @param page - Puppeteer page (can be from LambdaTest cloud session)
     * @param options - Optional settings
     */
    async saveProfile(id: string, page: any, options?: {
        /** Profile name for display */
        name?: string;
        /** Profile description */
        description?: string;
        /** Additional metadata to store */
        metadata?: Record<string, any>;
    }): Promise<Profile> {
        await this.ensureDir();

        // Get context from page
        const context = await this.contextService.getContext(page);

        // Flatten localStorage/sessionStorage for storage
        const localStorage = Object.values(context.localStorage || {})[0] || {};
        const sessionStorage = Object.values(context.sessionStorage || {})[0] || {};

        const filePath = this.getProfilePath(id);
        const now = new Date().toISOString();

        // Build profile data
        const profile: Profile = {
            id,
            name: options?.name,
            description: options?.description,
            cookies: context.cookies || [],
            localStorage,
            sessionStorage,
            createdAt: now,
            updatedAt: now,
            metadata: options?.metadata
        };

        // Preserve createdAt from existing profile
        if (await fs.pathExists(filePath)) {
            try {
                const existing = await fs.readJson(filePath);
                profile.createdAt = existing.createdAt || now;
            } catch {
                // Ignore read errors, use new createdAt
            }
        }

        await fs.writeJson(filePath, profile, { spaces: 2 });
        this.log(`Saved profile '${id}' (${profile.cookies.length} cookies)`);

        return profile;
    }

    // ================== Profile Management ==================

    /**
     * Create an empty profile
     */
    async create(id: string, options?: {
        name?: string;
        description?: string;
    }): Promise<Profile> {
        await this.ensureDir();

        const filePath = this.getProfilePath(id);
        const now = new Date().toISOString();

        const profile: Profile = {
            id,
            name: options?.name,
            description: options?.description,
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            createdAt: now,
            updatedAt: now
        };

        await fs.writeJson(filePath, profile, { spaces: 2 });
        this.log(`Created empty profile '${id}'`);

        return profile;
    }

    /**
     * Get a profile by ID
     */
    async get(id: string): Promise<Profile | null> {
        await this.ensureDir();

        const filePath = this.getProfilePath(id);
        if (!await fs.pathExists(filePath)) {
            return null;
        }

        return fs.readJson(filePath);
    }

    /**
     * List all profiles
     */
    async list(): Promise<Profile[]> {
        await this.ensureDir();

        const dir = this.getProfilesDir();
        if (!await fs.pathExists(dir)) {
            return [];
        }

        const files = await fs.readdir(dir);
        const profiles: Profile[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const profile = await fs.readJson(path.join(dir, file));
                    profiles.push(profile);
                } catch {
                    // Skip invalid files
                }
            }
        }

        return profiles;
    }

    /**
     * Check if a profile exists
     */
    async exists(id: string): Promise<boolean> {
        const filePath = this.getProfilePath(id);
        return fs.pathExists(filePath);
    }

    /**
     * Delete a profile
     */
    async delete(id: string): Promise<boolean> {
        const filePath = this.getProfilePath(id);
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            this.log(`Deleted profile '${id}'`);
            return true;
        }
        return false;
    }

    /**
     * Delete all profiles
     */
    async deleteAll(): Promise<number> {
        await this.ensureDir();

        const profiles = await this.list();
        for (const profile of profiles) {
            await this.delete(profile.id);
        }

        this.log(`Deleted ${profiles.length} profiles`);
        return profiles.length;
    }

    /**
     * Duplicate a profile
     */
    async duplicate(sourceId: string, targetId: string): Promise<Profile> {
        const source = await this.get(sourceId);
        if (!source) {
            throw new Error(`Source profile '${sourceId}' not found`);
        }

        const now = new Date().toISOString();
        const duplicate: Profile = {
            ...source,
            id: targetId,
            name: source.name ? `${source.name} (copy)` : undefined,
            createdAt: now,
            updatedAt: now
        };

        await fs.writeJson(this.getProfilePath(targetId), duplicate, { spaces: 2 });
        this.log(`Duplicated profile '${sourceId}' to '${targetId}'`);

        return duplicate;
    }

    // ================== Utility Methods ==================

    /**
     * Export a profile to a portable format
     */
    async export(id: string): Promise<string> {
        const profile = await this.get(id);
        if (!profile) {
            throw new Error(`Profile '${id}' not found`);
        }
        return JSON.stringify(profile, null, 2);
    }

    /**
     * Import a profile from JSON string
     */
    async import(json: string, options?: { overwrite?: boolean }): Promise<Profile> {
        await this.ensureDir();

        const profile: Profile = JSON.parse(json);
        if (!profile.id) {
            throw new Error('Invalid profile: missing id');
        }

        const exists = await this.exists(profile.id);
        if (exists && !options?.overwrite) {
            throw new Error(`Profile '${profile.id}' already exists. Use overwrite: true to replace.`);
        }

        profile.updatedAt = new Date().toISOString();
        await fs.writeJson(this.getProfilePath(profile.id), profile, { spaces: 2 });
        this.log(`Imported profile '${profile.id}'`);

        return profile;
    }

    // ================== Legacy Methods (for backwards compatibility) ==================

    /** @deprecated Use get() instead */
    async getProfile(id: string): Promise<Profile | null> {
        return this.get(id);
    }

    /** @deprecated Use list() instead */
    async listProfiles(): Promise<Profile[]> {
        return this.list();
    }

    /** @deprecated Use saveProfile() instead */
    async createFromSession(sessionId: string, page: any): Promise<{ id: string; status: string }> {
        const profileId = `profile_${sessionId}_${Date.now()}`;
        await this.saveProfile(profileId, page);
        return { id: profileId, status: 'READY' };
    }
}
