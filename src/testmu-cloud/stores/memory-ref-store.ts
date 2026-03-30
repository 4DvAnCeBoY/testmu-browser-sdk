import { RefStore, RefMapping } from './ref-store';

export class InMemoryRefStore implements RefStore {
    private store = new Map<string, { refs: Map<string, RefMapping>, url: string }>();

    async save(sessionId: string, refs: Map<string, RefMapping>, url: string): Promise<void> {
        this.store.set(sessionId, { refs: new Map(refs), url });
    }

    async load(sessionId: string): Promise<{ refs: Map<string, RefMapping>, url: string } | null> {
        return this.store.get(sessionId) || null;
    }

    async get(sessionId: string, ref: string): Promise<RefMapping | null> {
        const data = this.store.get(sessionId);
        if (!data) return null;
        return data.refs.get(ref) || null;
    }

    async clear(sessionId: string): Promise<void> {
        this.store.delete(sessionId);
    }
}
