
import { SessionEvent } from '../types.js';

/**
 * EventsService - Session Recording (RRWeb-style)
 * 
 * Provides session event recording for playback and debugging.
 * 
 * Note: Full RRWeb recording requires browser-side injection of the rrweb library.
 * This service provides the API structure and storage, but actual event capture
 * would need to be implemented via browser extension or CDP injection.
 */
export class EventsService {
    private sessionEvents: Map<string, SessionEvent[]> = new Map();

    /**
     * Get all recorded events for a session
     */
    getEvents(sessionId: string): SessionEvent[] {
        return this.sessionEvents.get(sessionId) || [];
    }

    /**
     * Add an event to a session's recording
     */
    addEvent(sessionId: string, event: SessionEvent): void {
        if (!this.sessionEvents.has(sessionId)) {
            this.sessionEvents.set(sessionId, []);
        }
        this.sessionEvents.get(sessionId)!.push(event);
    }

    /**
     * Add multiple events to a session's recording
     */
    addEvents(sessionId: string, events: SessionEvent[]): void {
        if (!this.sessionEvents.has(sessionId)) {
            this.sessionEvents.set(sessionId, []);
        }
        this.sessionEvents.get(sessionId)!.push(...events);
    }

    /**
     * Clear events for a session
     */
    clearEvents(sessionId: string): void {
        this.sessionEvents.delete(sessionId);
    }

    /**
     * Get event count for a session
     */
    getEventCount(sessionId: string): number {
        return this.sessionEvents.get(sessionId)?.length || 0;
    }

    /**
     * Start recording for a session
     * Note: This is a placeholder - actual recording requires rrweb injection
     */
    startRecording(sessionId: string): void {
        if (!this.sessionEvents.has(sessionId)) {
            this.sessionEvents.set(sessionId, []);
        }

        // Add a meta event to mark recording start
        this.addEvent(sessionId, {
            type: 0, // Meta event type in rrweb
            data: {
                href: '',
                width: 0,
                height: 0,
                recordingStart: true
            },
            timestamp: Date.now()
        });

        console.log(`[EventsService] Started recording for session ${sessionId}`);
    }

    /**
     * Stop recording for a session
     */
    stopRecording(sessionId: string): SessionEvent[] {
        const events = this.getEvents(sessionId);
        console.log(`[EventsService] Stopped recording for session ${sessionId}, captured ${events.length} events`);
        return events;
    }

    /**
     * Export events in RRWeb-compatible format
     */
    exportEvents(sessionId: string): string {
        const events = this.getEvents(sessionId);
        return JSON.stringify(events, null, 2);
    }

    /**
     * Import events from RRWeb format
     */
    importEvents(sessionId: string, eventsJson: string): void {
        try {
            const events = JSON.parse(eventsJson) as SessionEvent[];
            this.sessionEvents.set(sessionId, events);
        } catch (error) {
            console.error('Error importing events:', error);
            throw new Error('Invalid events JSON format');
        }
    }
}
