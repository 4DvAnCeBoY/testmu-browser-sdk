import { Session } from '../types';

export interface SessionStore {
    save(session: Session): Promise<void>;
    get(id: string): Promise<Session | null>;
    list(): Promise<Session[]>;
    delete(id: string): Promise<void>;
    deleteAll(): Promise<void>;
}
