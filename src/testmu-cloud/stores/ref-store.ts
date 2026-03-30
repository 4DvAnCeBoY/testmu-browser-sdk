export interface RefMapping {
    xpath: string;
    css: string;
    role: string;
    name: string;
    frameId?: string;
}

export interface RefStore {
    save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void>;
    load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null>;
    get(sessionId: string, ref: string): Promise<RefMapping | null>;
    clear(sessionId: string): Promise<void>;
}
