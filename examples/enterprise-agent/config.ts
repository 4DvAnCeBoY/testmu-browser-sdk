import { z } from 'zod';
// dotenv requirement removed - assume environment variables are loaded by runtime (e.g. --env-file or container)

/**
 * Configuration schema for the Enterprise Agent.
 * Validates environment variables at startup to prevent runtime failures.
 */
const ConfigSchema = z.object({
    // AI Provider Configuration
    OPENAI_API_KEY: z.string().optional(), // Optional if using Ollama exclusively
    OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
    MODEL_NAME: z.string().default('llama3'),

    // Browser Infrastructure Configuration
    BROWSER_WSE: z.string().optional().describe('WebSocket Endpoint for remote grid (e.g., LambdaTest/Steel)'),
    HEADLESS: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),

    // Operational Configuration
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    DEFAULT_TIMEOUT: z.number().default(30000),
});

export type Config = z.infer<typeof ConfigSchema>;

// Validate and export configuration
const rawConfig = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    MODEL_NAME: process.env.MODEL_NAME,
    BROWSER_WSE: process.env.BROWSER_WSE,
    HEADLESS: process.env.HEADLESS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DEFAULT_TIMEOUT: process.env.DEFAULT_TIMEOUT ? parseInt(process.env.DEFAULT_TIMEOUT) : undefined,
};

// "Fail Fast" - Throw error immediately if config is invalid
export const config = ConfigSchema.parse(rawConfig);
