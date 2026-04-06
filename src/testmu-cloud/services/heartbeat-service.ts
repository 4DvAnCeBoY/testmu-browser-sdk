
/**
 * HeartbeatService — keeps cloud browser sessions alive by sending periodic
 * lightweight pings. Prevents LambdaTest idle-timeout termination while the
 * agent is thinking/planning between actions.
 *
 * Each adapter registers a ping function after connecting. The service calls
 * it on a fixed interval until the session is released or the ping fails.
 */
export class HeartbeatService {
    private timers = new Map<string, ReturnType<typeof setInterval>>();

    /**
     * Start sending heartbeats for a session.
     *
     * @param sessionId  Unique session identifier
     * @param pingFn     Lightweight async function that touches the session
     *                   (e.g. page.evaluate('1'), driver.getCurrentUrl())
     * @param intervalMs Milliseconds between pings (default 60 000 = 1 min)
     */
    start(sessionId: string, pingFn: () => Promise<unknown>, intervalMs = 60_000): void {
        // Don't double-register
        this.stop(sessionId);

        console.error(`Heartbeat: started for session ${sessionId} (every ${intervalMs / 1000}s)`);

        const timer = setInterval(async () => {
            try {
                await pingFn();
            } catch {
                // Ping failed — session is likely gone. Clean up silently.
                console.error(`Heartbeat: ping failed for session ${sessionId}, stopping`);
                this.stop(sessionId);
            }
        }, intervalMs);

        // Allow the Node process to exit even if the timer is still running
        if (timer.unref) timer.unref();

        this.timers.set(sessionId, timer);
    }

    /** Stop heartbeat for a single session. */
    stop(sessionId: string): void {
        const timer = this.timers.get(sessionId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(sessionId);
            console.error(`Heartbeat: stopped for session ${sessionId}`);
        }
    }

    /** Stop all active heartbeats (used during graceful shutdown). */
    stopAll(): void {
        for (const id of this.timers.keys()) {
            this.stop(id);
        }
    }

    /** Check whether a heartbeat is active for a session. */
    isActive(sessionId: string): boolean {
        return this.timers.has(sessionId);
    }
}
