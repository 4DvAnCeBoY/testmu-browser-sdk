import { HeartbeatService } from '../heartbeat-service';

describe('HeartbeatService', () => {
    let service: HeartbeatService;

    beforeEach(() => {
        jest.useFakeTimers();
        service = new HeartbeatService();
    });

    afterEach(() => {
        service.stopAll();
        jest.useRealTimers();
    });

    describe('start', () => {
        it('registers a heartbeat and marks it active', () => {
            const pingFn = jest.fn().mockResolvedValue(undefined);
            service.start('s1', pingFn, 1000);

            expect(service.isActive('s1')).toBe(true);
        });

        it('calls pingFn on each interval tick', async () => {
            const pingFn = jest.fn().mockResolvedValue(undefined);
            service.start('s1', pingFn, 1000);

            // Advance past 3 intervals
            jest.advanceTimersByTime(3000);
            // Let microtasks (async callbacks) flush
            await Promise.resolve();

            expect(pingFn).toHaveBeenCalledTimes(3);
        });

        it('does not call pingFn before interval elapses', () => {
            const pingFn = jest.fn().mockResolvedValue(undefined);
            service.start('s1', pingFn, 5000);

            jest.advanceTimersByTime(4999);

            expect(pingFn).not.toHaveBeenCalled();
        });

        it('replaces existing heartbeat on double-start (no duplicate timers)', async () => {
            const pingFn1 = jest.fn().mockResolvedValue(undefined);
            const pingFn2 = jest.fn().mockResolvedValue(undefined);

            service.start('s1', pingFn1, 1000);
            service.start('s1', pingFn2, 1000);

            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            // Only the second ping function should fire
            expect(pingFn1).not.toHaveBeenCalled();
            expect(pingFn2).toHaveBeenCalledTimes(1);
        });
    });

    describe('retry threshold', () => {
        it('tolerates fewer than 3 consecutive failures', async () => {
            let callCount = 0;
            const pingFn = jest.fn().mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) throw new Error('transient');
                // succeeds on 3rd call
            });

            service.start('s1', pingFn, 1000);

            // Tick 1 — fail #1
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);

            // Tick 2 — fail #2
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);

            // Tick 3 — success, resets counter
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);
            expect(pingFn).toHaveBeenCalledTimes(3);
        });

        it('stops after 3 consecutive failures', async () => {
            const pingFn = jest.fn().mockRejectedValue(new Error('dead'));
            service.start('s1', pingFn, 1000);

            // Tick 1 — fail #1
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);

            // Tick 2 — fail #2
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);

            // Tick 3 — fail #3 → stops
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(false);
        });

        it('resets failure count on successful ping', async () => {
            let callCount = 0;
            const pingFn = jest.fn().mockImplementation(async () => {
                callCount++;
                // Fail on calls 1,2 then succeed on 3, then fail on 4,5 — should survive
                if (callCount <= 2 || callCount === 4 || callCount === 5) throw new Error('fail');
            });

            service.start('s1', pingFn, 1000);

            // Fails 1, 2
            jest.advanceTimersByTime(2000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);

            // Success on 3 — resets counter
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);

            // Fails 4, 5 — only 2 consecutive, still alive
            jest.advanceTimersByTime(2000);
            await Promise.resolve();
            expect(service.isActive('s1')).toBe(true);
        });
    });

    describe('stop', () => {
        it('stops a running heartbeat', () => {
            const pingFn = jest.fn().mockResolvedValue(undefined);
            service.start('s1', pingFn, 1000);

            service.stop('s1');

            expect(service.isActive('s1')).toBe(false);

            // Advancing time should NOT call pingFn
            jest.advanceTimersByTime(5000);
            expect(pingFn).not.toHaveBeenCalled();
        });

        it('is safe to call on non-existent session', () => {
            expect(() => service.stop('nonexistent')).not.toThrow();
        });
    });

    describe('stopAll', () => {
        it('stops all active heartbeats', () => {
            service.start('s1', jest.fn().mockResolvedValue(undefined), 1000);
            service.start('s2', jest.fn().mockResolvedValue(undefined), 1000);
            service.start('s3', jest.fn().mockResolvedValue(undefined), 1000);

            expect(service.isActive('s1')).toBe(true);
            expect(service.isActive('s2')).toBe(true);
            expect(service.isActive('s3')).toBe(true);

            service.stopAll();

            expect(service.isActive('s1')).toBe(false);
            expect(service.isActive('s2')).toBe(false);
            expect(service.isActive('s3')).toBe(false);
        });
    });

    describe('isActive', () => {
        it('returns false for unknown sessions', () => {
            expect(service.isActive('unknown')).toBe(false);
        });

        it('returns true after start, false after stop', () => {
            service.start('s1', jest.fn().mockResolvedValue(undefined), 1000);
            expect(service.isActive('s1')).toBe(true);

            service.stop('s1');
            expect(service.isActive('s1')).toBe(false);
        });
    });
});
