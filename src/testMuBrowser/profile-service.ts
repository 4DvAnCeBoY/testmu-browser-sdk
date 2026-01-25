
import * as fs from 'fs-extra';
import * as path from 'path';
import { Page } from 'puppeteer-core';
import { SessionContext, Cookie, ProfileData } from './types.js';
import { ContextService } from './services/context-service.js';

interface Profile {
    id: string;
    cookies: Cookie[];
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    createdAt?: string;
    updatedAt?: string;
}

const PROFILES_DIR = path.join(process.cwd(), '.profiles');

/**
 * ProfileService - Browser Profile Management
 * 
 * Manages persistent browser profiles for session state.
 * Profiles store cookies, localStorage, and sessionStorage.
 */
export class ProfileService {
    private contextService: ContextService;

    constructor() {
        fs.ensureDirSync(PROFILES_DIR);
        this.contextService = new ContextService();
    }

    /**
     * Load a profile into a page
     */
    async loadProfile(id: string, page: Page): Promise<void> {
        const filePath = path.join(PROFILES_DIR, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`[ProfileService] Profile ${id} not found`);
            return;
        }

        const data: Profile = await fs.readJson(filePath);

        // Use context service for proper injection
        const context: SessionContext = {
            cookies: data.cookies,
            localStorage: { 'default': data.localStorage },
            sessionStorage: { 'default': data.sessionStorage }
        };

        await this.contextService.setContext(page, context);
        console.log(`[ProfileService] Loaded profile ${id}`);
    }

    /**
     * Save page state to a profile
     */
    async saveProfile(id: string, page: Page): Promise<void> {
        // Get context from page
        const context = await this.contextService.getContext(page);

        // Flatten localStorage/sessionStorage for storage
        const localStorage = Object.values(context.localStorage || {})[0] || {};
        const sessionStorage = Object.values(context.sessionStorage || {})[0] || {};

        const profileData: Profile = {
            id,
            cookies: context.cookies || [],
            localStorage,
            sessionStorage,
            updatedAt: new Date().toISOString()
        };

        const filePath = path.join(PROFILES_DIR, `${id}.json`);

        // Preserve createdAt from existing profile
        if (await fs.pathExists(filePath)) {
            try {
                const existing = await fs.readJson(filePath);
                profileData.createdAt = existing.createdAt;
            } catch { }
        } else {
            profileData.createdAt = profileData.updatedAt;
        }

        await fs.writeJson(filePath, profileData, { spaces: 2 });
        console.log(`[ProfileService] Saved profile ${id}`);
    }

    /**
     * List all profile IDs
     */
    async list(): Promise<string[]> {
        if (!fs.existsSync(PROFILES_DIR)) return [];
        const files = await fs.readdir(PROFILES_DIR);
        return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    }

    /**
     * Get all profiles with metadata (Steel-compatible)
     */
    async listProfiles(): Promise<Profile[]> {
        const ids = await this.list();
        const profiles: Profile[] = [];

        for (const id of ids) {
            try {
                const profile = await this.getProfile(id);
                if (profile) {
                    profiles.push(profile);
                }
            } catch (e) {
                console.error(`Error loading profile ${id}:`, e);
            }
        }

        return profiles;
    }

    /**
     * Get a specific profile
     */
    async getProfile(id: string): Promise<Profile | null> {
        const filePath = path.join(PROFILES_DIR, `${id}.json`);
        if (!await fs.pathExists(filePath)) {
            return null;
        }
        return fs.readJson(filePath);
    }

    /**
     * Create an empty profile
     */
    async create(id: string): Promise<{ id: string; status: string; createdAt: string }> {
        const filePath = path.join(PROFILES_DIR, `${id}.json`);
        const createdAt = new Date().toISOString();

        if (!fs.existsSync(filePath)) {
            const profile: Profile = {
                id,
                cookies: [],
                localStorage: {},
                sessionStorage: {},
                createdAt,
                updatedAt: createdAt
            };
            await fs.writeJson(filePath, profile, { spaces: 2 });
        }

        return { id, status: 'READY', createdAt };
    }

    /**
     * Create a profile from an existing session (Steel-compatible)
     * This matches Steel's profiles.create({ sessionId }) API
     */
    async createFromSession(sessionId: string, page: Page): Promise<{ id: string; status: string }> {
        const profileId = `profile_${sessionId}_${Date.now()}`;
        await this.saveProfile(profileId, page);
        return { id: profileId, status: 'READY' };
    }

    /**
     * Delete a profile
     */
    async delete(id: string): Promise<void> {
        const filePath = path.join(PROFILES_DIR, `${id}.json`);
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            console.log(`[ProfileService] Deleted profile ${id}`);
        }
    }

    /**
     * Check if a profile exists
     */
    async exists(id: string): Promise<boolean> {
        const filePath = path.join(PROFILES_DIR, `${id}.json`);
        return fs.pathExists(filePath);
    }

    /**
     * Duplicate a profile
     */
    async duplicate(sourceId: string, targetId: string): Promise<void> {
        const sourcePath = path.join(PROFILES_DIR, `${sourceId}.json`);
        const targetPath = path.join(PROFILES_DIR, `${targetId}.json`);

        if (!await fs.pathExists(sourcePath)) {
            throw new Error(`Source profile not found: ${sourceId}`);
        }

        const profile = await fs.readJson(sourcePath);
        profile.id = targetId;
        profile.createdAt = new Date().toISOString();
        profile.updatedAt = profile.createdAt;

        await fs.writeJson(targetPath, profile, { spaces: 2 });
    }
}
