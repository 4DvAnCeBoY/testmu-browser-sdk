export interface RefMapping {
    xpath: string;
    css: string;
    role: string;
    name: string;
    frameId?: string;
}

export interface RefStore {
    save(sessionId: string, refs: Map<string, RefMapping>, url: string, clientId?: string): Promise<void>;
    load(sessionId: string, clientId?: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null>;
    get(sessionId: string, ref: string, clientId?: string): Promise<RefMapping | null>;
    clear(sessionId: string, clientId?: string): Promise<void>;
}
