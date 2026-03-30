import { RefStore, RefMapping } from './ref-store';

export class InMemoryRefStore implements RefStore {
    private store = new Map<string, { refs: Map<string, RefMapping>, url: string }>();

    private storeKey(sessionId: string, clientId?: string): string {
        return clientId ? `${sessionId}:${clientId}` : sessionId;
    }

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string, clientId?: string): Promise<void> {
        this.store.set(this.storeKey(sessionId, clientId), { refs: new Map(refs), url });
    }

    async load(sessionId: string, clientId?: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        return this.store.get(this.storeKey(sessionId, clientId)) || null;
    }

    async get(sessionId: string, ref: string, clientId?: string): Promise<RefMapping | null> {
        const data = this.store.get(this.storeKey(sessionId, clientId));
        if (!data) return null;
        return data.refs.get(ref) || null;
    }

    async clear(sessionId: string, clientId?: string): Promise<void> {
        this.store.delete(this.storeKey(sessionId, clientId));
    }
}
