
import { SessionManager } from './session-manager.js';
import {
    SessionConfig,
    Session,
    ComputerActionParams,
    ComputerActionResponse,
    SessionContext,
    SessionEvent,
    ReleaseResponse,
    LiveDetailsResponse,
    ScrapeParams,
    ScrapeResponse,
    ScreenshotParams,
    ScreenshotResponse,
    PdfParams,
    PdfResponse
} from './types.js';

// Adapters
import { PuppeteerAdapter } from './adapters/puppeteer.js';
import { PlaywrightAdapter } from './adapters/playwright.js';
import { SeleniumAdapter } from './adapters/selenium.js';

// Services
import { QuickActionsService } from './services/quick-actions.js';
import { FileService } from './services/file-service.js';
import { ExtensionService } from './services/extension-service.js';
import { CredentialService } from './services/credential-service.js';
import { ProfileService } from './profile-service.js';
import { CaptchaService } from './services/captcha-service.js';
import { TunnelService } from './services/tunnel-service.js';
import { ComputerService } from './services/computer-service.js';
import { ContextService } from './services/context-service.js';
import { EventsService } from './services/events-service.js';

/**
 * testMuBrowser - Enterprise-Grade Steel.dev Compatibility Layer
 * 
 * Provides a Steel-compatible API for LambdaTest & local browsers.
 * Features include:
 * - Session management with full Steel API parity
 * - AI agent computer actions (mouse, keyboard, screenshots)
 * - Browser context management (cookies, localStorage, sessionStorage)
 * - Captcha solving integration
 * - File and extension management
 * - Profile persistence
 * 
 * @example
 * ```typescript
 * import { testMuBrowser } from 'testmubrowser';
 * 
 * const browser = new testMuBrowser();
 * const session = await browser.sessions.create({ local: true });
 * const page = await browser.puppeteer.connect(session);
 * 
 * // Use AI agent actions
 * await browser.sessions.computer(session.id, page, { action: 'click', coordinate: [100, 200] });
 * 
 * await browser.sessions.release(session.id);
 * ```
 */
export class testMuBrowser {
    private sessionManager: SessionManager;

    // Expose adapters
    public puppeteer: PuppeteerAdapter;
    public playwright: PlaywrightAdapter;
    public selenium: SeleniumAdapter;

    // Core Services
    public quick: QuickActionsService;
    public files: FileService;
    public extensions: ExtensionService;
    public credentials: CredentialService;
    public profiles: ProfileService;
    public captcha: CaptchaService;
    public tunnel: TunnelService;

    // New Steel Parity Services
    public computer: ComputerService;
    public context: ContextService;
    public events: EventsService;

    constructor() {
        this.sessionManager = new SessionManager();

        // Adapters
        this.puppeteer = new PuppeteerAdapter();
        this.playwright = new PlaywrightAdapter();
        this.selenium = new SeleniumAdapter();

        // Services
        this.quick = new QuickActionsService();
        this.files = new FileService();
        this.extensions = new ExtensionService();
        this.credentials = new CredentialService();
        this.profiles = new ProfileService();
        this.captcha = new CaptchaService();
        this.tunnel = new TunnelService();

        // New Steel Parity Services
        this.computer = new ComputerService();
        this.context = new ContextService();
        this.events = new EventsService();

        // Pass tunnel service to SessionManager for automatic handling
        this.sessionManager.setTunnelService(this.tunnel);
    }

    // ================== Quick Action Aliases (Steel.dev SDK style) ==================

    /**
     * Scrape a webpage - shorthand for quick.scrape()
     */
    public async scrape(params: ScrapeParams | string): Promise<ScrapeResponse> {
        return this.quick.scrape(params);
    }

    /**
     * Take a screenshot - shorthand for quick.screenshot()
     */
    public async screenshot(params: ScreenshotParams | string, fullPage?: boolean): Promise<ScreenshotResponse | Buffer> {
        return this.quick.screenshot(params, fullPage);
    }

    /**
     * Generate PDF - shorthand for quick.pdf()
     */
    public async pdf(params: PdfParams | string): Promise<PdfResponse | Buffer> {
        return this.quick.pdf(params);
    }

    // ================== Sessions API (Full Steel Parity) ==================

    sessions = {
        /**
         * Create a new browser session
         */
        create: async (config: SessionConfig = {}): Promise<Session> => {
            return await this.sessionManager.createSession(config);
        },

        /**
         * List all active sessions
         */
        list: (): Session[] => {
            return this.sessionManager.listSessions();
        },

        /**
         * Retrieve a specific session by ID
         */
        retrieve: (sessionId: string): Session | undefined => {
            return this.sessionManager.getSession(sessionId);
        },

        /**
         * Release a specific session
         */
        release: async (sessionId: string): Promise<ReleaseResponse> => {
            return await this.sessionManager.releaseSession(sessionId);
        },

        /**
         * Release all active sessions
         */
        releaseAll: async (): Promise<ReleaseResponse> => {
            return await this.sessionManager.releaseAll();
        },

        /**
         * Execute computer actions (mouse, keyboard, screenshot)
         * This is the key API for AI agents
         */
        computer: async (
            sessionId: string,
            page: any,
            params: ComputerActionParams
        ): Promise<ComputerActionResponse> => {
            return await this.computer.execute(page, params);
        },

        /**
         * Get session context (cookies, localStorage, sessionStorage)
         */
        context: async (sessionId: string, page: any): Promise<SessionContext> => {
            return await this.context.getContext(page);
        },

        /**
         * Get recorded session events (RRWeb format)
         */
        events: (sessionId: string): SessionEvent[] => {
            return this.sessionManager.getSessionEvents(sessionId);
        },

        /**
         * Get live session details (pages, tabs, state)
         */
        liveDetails: async (sessionId: string): Promise<LiveDetailsResponse | null> => {
            return await this.sessionManager.getLiveDetails(sessionId);
        },

        // Session-scoped file operations
        files: {
            list: async (sessionId: string) => {
                return this.files.listSessionFiles(sessionId);
            },
            upload: async (sessionId: string, file: Buffer, filename: string) => {
                return this.files.uploadToSession(sessionId, file, filename);
            },
            download: async (sessionId: string, path: string) => {
                return this.files.downloadFromSession(sessionId, path);
            },
            downloadArchive: async (sessionId: string) => {
                return this.files.downloadSessionArchive(sessionId);
            },
            delete: async (sessionId: string, path: string) => {
                return this.files.deleteFromSession(sessionId, path);
            },
            deleteAll: async (sessionId: string) => {
                return this.files.deleteAllSessionFiles(sessionId);
            }
        },

        // Session-scoped captcha operations
        captchas: {
            solveImage: async (sessionId: string, params: any) => {
                return this.captcha.solveImage(sessionId, params);
            },
            status: async (sessionId: string) => {
                return this.captcha.status(sessionId);
            }
        }
    };
}

// ================== Export Types ==================
export * from './types.js';

// ================== Export Services ==================
export { SessionManager } from './session-manager.js';
export { PuppeteerAdapter } from './adapters/puppeteer.js';
export { PlaywrightAdapter } from './adapters/playwright.js';
export { SeleniumAdapter } from './adapters/selenium.js';
export { QuickActionsService } from './services/quick-actions.js';
export { FileService } from './services/file-service.js';
export { ExtensionService } from './services/extension-service.js';
export { CredentialService } from './services/credential-service.js';
export { ProfileService } from './profile-service.js';
export { CaptchaService } from './services/captcha-service.js';
export { TunnelService } from './services/tunnel-service.js';
export { ComputerService } from './services/computer-service.js';
export { ContextService } from './services/context-service.js';
export { EventsService } from './services/events-service.js';
