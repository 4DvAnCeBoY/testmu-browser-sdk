
import { Page } from 'puppeteer-core';
import {
    ComputerActionParams,
    ComputerActionResponse,
    ComputerActionType
} from '../types.js';

/**
 * ComputerService - AI Agent Mouse/Keyboard Control
 * 
 * Provides programmatic control for AI agents to interact with browser sessions
 * using mouse movements, clicks, keyboard input, and screenshots.
 * 
 * This is a critical feature for AI agent use cases (like Claude computer use).
 */
export class ComputerService {

    /**
     * Execute a computer action on a page
     */
    async execute(page: Page, params: ComputerActionParams): Promise<ComputerActionResponse> {
        try {
            let output = '';
            let base64_image: string | undefined;

            switch (params.action) {
                case 'move':
                    if (params.coordinate) {
                        await page.mouse.move(params.coordinate[0], params.coordinate[1]);
                        output = `Moved mouse to (${params.coordinate[0]}, ${params.coordinate[1]})`;
                    }
                    break;

                case 'click':
                    if (params.coordinate) {
                        await page.mouse.click(params.coordinate[0], params.coordinate[1]);
                        output = `Clicked at (${params.coordinate[0]}, ${params.coordinate[1]})`;
                    }
                    break;

                case 'double_click':
                    if (params.coordinate) {
                        await page.mouse.click(params.coordinate[0], params.coordinate[1], { clickCount: 2 });
                        output = `Double-clicked at (${params.coordinate[0]}, ${params.coordinate[1]})`;
                    }
                    break;

                case 'right_click':
                    if (params.coordinate) {
                        await page.mouse.click(params.coordinate[0], params.coordinate[1], { button: 'right' });
                        output = `Right-clicked at (${params.coordinate[0]}, ${params.coordinate[1]})`;
                    }
                    break;

                case 'scroll':
                    const deltaX = params.deltaX || 0;
                    const deltaY = params.deltaY || 0;

                    // Move to coordinate first if provided
                    if (params.coordinate) {
                        await page.mouse.move(params.coordinate[0], params.coordinate[1]);
                    }

                    await page.mouse.wheel({ deltaX, deltaY });
                    output = `Scrolled by (${deltaX}, ${deltaY})`;
                    break;

                case 'type':
                    if (params.text) {
                        await page.keyboard.type(params.text);
                        output = `Typed: "${params.text}"`;
                    }
                    break;

                case 'key':
                    if (params.text) {
                        // Handle special keys like "Enter", "Escape", "Tab", etc.
                        await page.keyboard.press(params.text as any);
                        output = `Pressed key: ${params.text}`;
                    }
                    break;

                case 'screenshot':
                    const screenshot = await page.screenshot({
                        encoding: 'base64',
                        fullPage: false
                    });
                    base64_image = screenshot as string;
                    output = 'Screenshot captured';
                    break;

                default:
                    return {
                        error: `Unknown action: ${params.action}`,
                        system: 'computer-service'
                    };
            }

            // Take screenshot if requested with the action
            if (params.screenshot && params.action !== 'screenshot') {
                const screenshot = await page.screenshot({
                    encoding: 'base64',
                    fullPage: false
                });
                base64_image = screenshot as string;
            }

            return {
                output,
                base64_image,
                system: 'computer-service'
            };

        } catch (error) {
            return {
                error: error instanceof Error ? error.message : String(error),
                system: 'computer-service'
            };
        }
    }

    /**
     * Take a screenshot and return as base64
     */
    async screenshot(page: Page, fullPage: boolean = false): Promise<string> {
        const screenshot = await page.screenshot({
            encoding: 'base64',
            fullPage
        });
        return screenshot as string;
    }

    /**
     * Move mouse to coordinates
     */
    async move(page: Page, x: number, y: number): Promise<void> {
        await page.mouse.move(x, y);
    }

    /**
     * Click at coordinates
     */
    async click(page: Page, x: number, y: number): Promise<void> {
        await page.mouse.click(x, y);
    }

    /**
     * Type text
     */
    async type(page: Page, text: string): Promise<void> {
        await page.keyboard.type(text);
    }

    /**
     * Press a key
     */
    async press(page: Page, key: string): Promise<void> {
        await page.keyboard.press(key as any);
    }

    /**
     * Scroll the page
     */
    async scroll(page: Page, deltaX: number, deltaY: number): Promise<void> {
        await page.mouse.wheel({ deltaX, deltaY });
    }
}
