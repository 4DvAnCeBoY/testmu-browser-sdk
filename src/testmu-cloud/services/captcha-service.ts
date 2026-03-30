
import {
    CaptchaSolveParams,
    CaptchaSolveResponse,
    CaptchaStatusResponse
} from '../types.js';

/**
 * CaptchaService - Captcha Solving Integration
 * 
 * Supports integration with external services like 2Captcha, Anti-Captcha,
 * or LambdaTest's built-in solving.
 * 
 * Configure via environment variables:
 * - CAPTCHA_API_KEY: API key for the captcha service
 * - CAPTCHA_SERVICE: Service to use ('2captcha', 'anticaptcha', 'lambdatest')
 */
export class CaptchaService {
    private jobs: Map<string, CaptchaStatusResponse> = new Map();
    private apiKey: string;
    private service: string;

    constructor() {
        this.apiKey = process.env.CAPTCHA_API_KEY || '';
        this.service = process.env.CAPTCHA_SERVICE || '2captcha';
    }

    async solveImage(
        sessionId: string,
        params: CaptchaSolveParams
    ): Promise<CaptchaSolveResponse> {
        const jobId = `captcha_${sessionId}_${Date.now()}`;

        // Initialize job status
        this.jobs.set(jobId, {
            id: jobId,
            status: 'pending'
        });

        // Start async solving
        this.processCapture(jobId, params).catch((err) => {
            this.jobs.set(jobId, { id: jobId, status: 'failed', error: err instanceof Error ? err.message : String(err) });
        });

        return {
            id: jobId,
            status: 'pending'
        };
    }

    async status(sessionId: string): Promise<CaptchaStatusResponse> {
        // Find the most recent job for this session
        const jobs = Array.from(this.jobs.entries())
            .filter(([id]) => id.includes(sessionId))
            .sort((a, b) => {
                const timeA = parseInt(a[0].split('_').pop() || '0');
                const timeB = parseInt(b[0].split('_').pop() || '0');
                return timeB - timeA;
            });

        if (jobs.length === 0) {
            return {
                id: '',
                status: 'failed',
                error: 'No captcha job found for session'
            };
        }

        return jobs[0][1];
    }

    /**
     * Get status by job ID
     */
    async getJobStatus(jobId: string): Promise<CaptchaStatusResponse> {
        return this.jobs.get(jobId) || {
            id: jobId,
            status: 'failed',
            error: 'Job not found'
        };
    }

    /**
     * Process captcha (simulated or real API call)
     */
    private async processCapture(jobId: string, params: CaptchaSolveParams): Promise<void> {
        const startTime = Date.now();

        try {
            // Update to processing
            this.jobs.set(jobId, {
                id: jobId,
                status: 'processing'
            });

            if (!this.apiKey) {
                throw new Error('CAPTCHA_API_KEY is not configured. Set the CAPTCHA_API_KEY environment variable to enable captcha solving.');
            }

            // Real API integration
            const solution = await this.callExternalService(params);

            // Update to solved
            this.jobs.set(jobId, {
                id: jobId,
                status: 'solved',
                solution,
                solvingTime: Date.now() - startTime
            });

        } catch (error) {
            this.jobs.set(jobId, {
                id: jobId,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                solvingTime: Date.now() - startTime
            });
        }
    }

    /**
     * Call external captcha solving service
     */
    private async callExternalService(params: CaptchaSolveParams): Promise<string> {
        switch (this.service) {
            case '2captcha':
                return this.solve2Captcha(params);
            case 'anticaptcha':
                return this.solveAntiCaptcha(params);
            case 'lambdatest':
                return this.solveLambdaTest(params);
            default:
                throw new Error(`Unknown captcha service: ${this.service}`);
        }
    }

    /**
     * 2Captcha API integration (placeholder)
     */
    private async solve2Captcha(params: CaptchaSolveParams): Promise<string> {
        // TODO: Implement actual 2Captcha API calls
        // POST to https://2captcha.com/in.php
        // Poll https://2captcha.com/res.php
        console.log('[CaptchaService] 2Captcha integration - implement API calls');
        throw new Error('2Captcha integration not yet implemented. Set CAPTCHA_API_KEY and implement API calls.');
    }

    /**
     * Anti-Captcha API integration (placeholder)
     */
    private async solveAntiCaptcha(params: CaptchaSolveParams): Promise<string> {
        // TODO: Implement actual Anti-Captcha API calls
        console.log('[CaptchaService] Anti-Captcha integration - implement API calls');
        throw new Error('Anti-Captcha integration not yet implemented.');
    }

    /**
     * TestMu AI Browser Cloud captcha solving (placeholder)
     */
    private async solveLambdaTest(params: CaptchaSolveParams): Promise<string> {
        // TODO: Implement TestMu AI's captcha solving API
        console.log('[CaptchaService] TestMu AI captcha solving - implement API calls');
        throw new Error('TestMu AI captcha integration not yet implemented.');
    }

    /**
     * Simulate delay for development/testing
     */
    private simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ================== Legacy API for backwards compatibility ==================

    /**
     * @deprecated Use solveImage() instead
     */
    async solve(params: any): Promise<{ id: string; status: string; code?: string }> {
        const response = await this.solveImage('legacy', params);

        // Wait for solving to complete (for backwards compatibility)
        await this.simulateDelay(2500);
        const status = await this.getJobStatus(response.id);

        return {
            id: status.id,
            status: status.status === 'solved' ? 'SOLVED' : status.status.toUpperCase(),
            code: status.solution
        };
    }

    /**
     * @deprecated Use getJobStatus() instead
     */
    async getResult(id: string) {
        const status = await this.getJobStatus(id);
        return {
            id: status.id,
            status: status.status === 'solved' ? 'SOLVED' : status.status.toUpperCase(),
            code: status.solution
        };
    }
}
