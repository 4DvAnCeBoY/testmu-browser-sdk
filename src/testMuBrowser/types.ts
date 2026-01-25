
// ============================================
// Steel SDK Parity Types
// Full compatibility with Steel.dev API
// ============================================

// -------------------- Cookie Types --------------------
export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    partitionKey?: {
        hasCrossSiteAncestor: boolean;
        topLevelSite: string;
    };
    priority?: 'Low' | 'Medium' | 'High';
    sameParty?: boolean;
    session?: boolean;
    size?: number;
    sourcePort?: number;
    sourceScheme?: 'Unset' | 'NonSecure' | 'Secure';
    url?: string;
}

// -------------------- IndexedDB Types --------------------
export interface IndexedDBRecord {
    key?: unknown;
    value?: unknown;
    blobFiles?: Array<{
        blobNumber: number;
        mimeType: string;
        size: number;
        filename?: string;
        lastModified?: string;
        path?: string;
    }>;
}

export interface IndexedDBStore {
    id: number;
    name: string;
    records: IndexedDBRecord[];
}

export interface IndexedDBDatabase {
    id: number;
    name: string;
    data: IndexedDBStore[];
}

// -------------------- Session Context --------------------
export interface SessionContext {
    cookies?: Cookie[];
    localStorage?: Record<string, Record<string, string>>;
    sessionStorage?: Record<string, Record<string, string>>;
    indexedDB?: Record<string, IndexedDBDatabase[]>;
}

// -------------------- Profile Types --------------------
export interface ProfileData {
    cookies: Cookie[];
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
}

// -------------------- Stealth Config --------------------
export interface StealthConfig {
    humanizeInteractions?: boolean;
    skipFingerprintInjection?: boolean;
}

// -------------------- Debug Config --------------------
export interface DebugConfig {
    interactive?: boolean;
    systemCursor?: boolean;
}

// -------------------- Device Config --------------------
export interface DeviceConfig {
    device?: 'desktop' | 'mobile';
}

// -------------------- Dimensions --------------------
export interface Dimensions {
    width: number;
    height: number;
}

// -------------------- Bandwidth Optimization --------------------
export interface OptimizeBandwidthConfig {
    blockImages?: boolean;
    blockMedia?: boolean;
    blockStylesheets?: boolean;
    blockHosts?: string[];
    blockUrlPatterns?: string[];
}

// -------------------- Credentials Config --------------------
export interface CredentialsConfig {
    autoSubmit?: boolean;
    blurFields?: boolean;
    exactOrigin?: boolean;
}

// -------------------- Session Configuration (Full Steel Parity) --------------------
export interface SessionConfig {
    // Original testMuBrowser options
    lambdatestOptions?: any;
    stealth?: boolean;
    profileId?: string;
    proxy?: string;
    geoLocation?: string;
    tunnel?: boolean;
    tunnelName?: string;
    local?: boolean;
    customWebSocketUrl?: string;

    // Steel SDK Parity Options
    blockAds?: boolean;
    dimensions?: Dimensions;
    solveCaptcha?: boolean;
    sessionContext?: SessionContext;
    stealthConfig?: StealthConfig;
    optimizeBandwidth?: boolean | OptimizeBandwidthConfig;
    extensionIds?: string[];
    headless?: boolean;
    timeout?: number;
    userAgent?: string;
    deviceConfig?: DeviceConfig;
    debugConfig?: DebugConfig;
    isSelenium?: boolean;
    persistProfile?: boolean;
    credentials?: CredentialsConfig;
    region?: string;
    concurrency?: number;
    sessionId?: string; // Custom UUID
    namespace?: string;
    proxyUrl?: string; // Alternative to proxy
    useProxy?: boolean | { geolocation?: string } | { server?: string };
}

// -------------------- Session Response (Full Steel Parity) --------------------
export interface Session {
    id: string;
    websocketUrl: string;
    debugUrl: string;
    config: SessionConfig;

    // Steel SDK Parity Fields
    status?: 'live' | 'released' | 'failed';
    createdAt?: string;
    timeout?: number;
    dimensions?: Dimensions;
    sessionViewerUrl?: string;
    creditsUsed?: number;
    duration?: number;
    eventCount?: number;
    proxyBytesUsed?: number;
    proxySource?: 'steel' | 'external' | null;
    stealthConfig?: StealthConfig;
    optimizeBandwidth?: OptimizeBandwidthConfig;
    debugConfig?: DebugConfig;
    deviceConfig?: DeviceConfig;
    headless?: boolean;
    isSelenium?: boolean;
    persistProfile?: boolean;
    profileId?: string;
    region?: string;
    solveCaptcha?: boolean;
    userAgent?: string;
}

// -------------------- Computer Actions (AI Agent) --------------------
export type ComputerActionType =
    | 'move'
    | 'click'
    | 'double_click'
    | 'right_click'
    | 'scroll'
    | 'type'
    | 'key'
    | 'screenshot';

export interface ComputerActionParams {
    action: ComputerActionType;
    coordinate?: [number, number];
    text?: string;
    deltaX?: number;
    deltaY?: number;
    screenshot?: boolean;
}

export interface ComputerActionResponse {
    base64_image?: string;
    output?: string;
    error?: string;
    system?: string;
}

// -------------------- Session Events (RRWeb) --------------------
export interface SessionEvent {
    type: number;
    data: unknown;
    timestamp: number;
}

// -------------------- Live Details --------------------
export interface PageInfo {
    id: string;
    url: string;
    title: string;
    favicon: string | null;
    sessionViewerUrl: string;
    sessionViewerFullscreenUrl: string;
}

export interface LiveDetailsResponse {
    pages: PageInfo[];
    wsUrl: string;
    sessionViewerUrl: string;
    sessionViewerFullscreenUrl: string;
}

// -------------------- Release Response --------------------
export interface ReleaseResponse {
    success: boolean;
    message: string;
}

// -------------------- Captcha Types --------------------
export interface CaptchaSolveParams {
    selector?: string;
    imageUrl?: string;
    type?: 'recaptcha' | 'hcaptcha' | 'image' | 'turnstile';
    siteKey?: string;
    pageUrl?: string;
}

export interface CaptchaSolveResponse {
    id: string;
    status: 'pending' | 'processing' | 'solved' | 'failed';
    solution?: string;
    error?: string;
}

export interface CaptchaStatusResponse {
    id: string;
    status: 'pending' | 'processing' | 'solved' | 'failed';
    solution?: string;
    error?: string;
    solvingTime?: number;
}

// -------------------- Files Types --------------------
export interface FileInfo {
    path: string;
    name: string;
    size: number;
    createdAt: string;
    mimeType?: string;
}

// -------------------- Extensions Types --------------------
export interface Extension {
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    createdAt: string;
}

export interface ExtensionUploadResponse {
    id: string;
    name: string;
    success: boolean;
}

// -------------------- Credentials Types --------------------
export interface Credential {
    id: string;
    url: string;
    username: string;
    password: string;
    createdAt: string;
    updatedAt?: string;
}

// -------------------- Quick Actions Types --------------------
export interface ScrapeParams {
    url: string;
    delay?: number;
    waitFor?: string;
    sessionId?: string;
    format?: 'html' | 'markdown' | 'text' | 'readability';
}

export interface ScrapeResponse {
    title: string;
    content: string;
    url: string;
    markdown?: string;
    html?: string;
    metadata?: Record<string, string>;
}

export interface ScreenshotParams {
    url: string;
    fullPage?: boolean;
    delay?: number;
    sessionId?: string;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
}

export interface ScreenshotResponse {
    data: Buffer;
    format: string;
    width: number;
    height: number;
}

export interface PdfParams {
    url: string;
    sessionId?: string;
    format?: 'A4' | 'Letter' | 'Legal';
    landscape?: boolean;
    printBackground?: boolean;
    margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
}

export interface PdfResponse {
    data: Buffer;
    pageCount: number;
}
