import { Session } from '../types';
import { SessionStore } from './session-store';

export class InMemorySessionStore implements SessionStore {
    private sessions = new Map<string, Session>();

    async save(session: Session): Promise<void> {
        this.sessions.set(session.id, session);
    }

    async get(id: string): Promise<Session | null> {
        return this.sessions.get(id) || null;
    }

    async list(): Promise<Session[]> {
        return Array.from(this.sessions.values()).filter(s => s.status === 'live');
    }

    async delete(id: string): Promise<void> {
        this.sessions.delete(id);
    }

    async deleteAll(): Promise<void> {
        this.sessions.clear();
    }
}
