import { z } from 'zod';

/**
 * Schema for Actions the Agent can perform.
 * Shared between the LLM prompt and the runtime executor.
 */
export const AgentActionSchema = z.object({
    thought: z.string().describe("Your strategic reasoning for this step."),
    action: z.enum(['navigate', 'click', 'type', 'extract', 'done', 'wait'])
        .describe("The specific operation to perform."),
    params: z.object({
        url: z.string().optional().describe("URL for navigation"),
        selector: z.string().optional().describe("CSS selector or reliable text identifier"),
        text: z.string().optional().describe("Text input content"),
        key: z.string().optional().describe("Key to store extracted data"),
    }).describe("Parameters required for the chosen action"),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

/**
 * Represents the current state of the browser world.
 */
export interface AgentState {
    url: string;
    title: string;
    screenshot?: string; // base64
    domSnippet: string;
    lastAction?: AgentAction;
    error?: string;
}

/**
 * Structured result of an agent run.
 */
export interface AgentResult {
    success: boolean;
    data: Record<string, any>;
    history: AgentAction[];
    durationMs: number;
}
