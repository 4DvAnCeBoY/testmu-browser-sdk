
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
    private failureCounts = new Map<string, number>();

    /** Max consecutive ping failures before stopping the heartbeat. */
    private static readonly MAX_FAILURES = 3;

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

        this.failureCounts.set(sessionId, 0);
        console.error(`Heartbeat: started for session ${sessionId} (every ${intervalMs / 1000}s)`);

        const timer = setInterval(async () => {
            try {
                await pingFn();
                // Reset failure count on success
                this.failureCounts.set(sessionId, 0);
            } catch {
                const failures = (this.failureCounts.get(sessionId) || 0) + 1;
                this.failureCounts.set(sessionId, failures);

                if (failures >= HeartbeatService.MAX_FAILURES) {
                    console.error(`Heartbeat: ${failures} consecutive failures for session ${sessionId}, stopping`);
                    this.stop(sessionId);
                } else {
                    console.error(`Heartbeat: ping failed for session ${sessionId} (${failures}/${HeartbeatService.MAX_FAILURES}), will retry`);
                }
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
            this.failureCounts.delete(sessionId);
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
