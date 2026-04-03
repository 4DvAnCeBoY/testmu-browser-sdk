
import { Page } from 'puppeteer-core';
import {
    ComputerActionParams,
    ComputerActionResponse,
} from '../types.js';
import { detectFramework } from '../utils/framework-detect.js';

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

                case 'scroll': {
                    const deltaX = params.deltaX || 0;
                    const deltaY = params.deltaY || 0;

                    // Move to coordinate first if provided
                    if (params.coordinate) {
                        await page.mouse.move(params.coordinate[0], params.coordinate[1]);
                    }

                    await this.scroll(page, deltaX, deltaY);
                    output = `Scrolled by (${deltaX}, ${deltaY})`;
                    break;
                }

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

                case 'screenshot': {
                    base64_image = await this.captureScreenshot(page, false);
                    output = 'Screenshot captured';
                    break;
                }

                default:
                    return {
                        error: `Unknown action: ${params.action}`,
                        system: 'computer-service'
                    };
            }

            // Take screenshot if requested with the action
            if (params.screenshot && params.action !== 'screenshot') {
                base64_image = await this.captureScreenshot(page, false);
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
     * Capture screenshot with CDP fallback for cloud Playwright sessions.
     * Remote grids may return blank PNGs from page.screenshot(); CDP is more reliable.
     */
    private async captureScreenshot(page: any, fullPage: boolean): Promise<string> {
        const framework = detectFramework(page);

        // Both frameworks: try CDP-based capture first for reliability on cloud grids
        if (fullPage) {
            let cdpSession: any = null;
            try {
                cdpSession = framework === 'playwright'
                    ? await page.context().newCDPSession(page)
                    : await page.createCDPSession();
                const metrics = await cdpSession.send('Page.getLayoutMetrics');
                const contentSize = metrics.cssContentSize || metrics.contentSize;
                if (contentSize && contentSize.width > 0 && contentSize.height > 0) {
                    const result = await cdpSession.send('Page.captureScreenshot', {
                        format: 'png',
                        clip: { x: 0, y: 0, width: contentSize.width, height: contentSize.height, scale: 1 },
                    });
                    if (result.data) return result.data;
                }
            } catch {
                // CDP not available — fall through to standard API
            } finally {
                if (cdpSession) {
                    try { await cdpSession.detach(); } catch { /* ignore */ }
                }
            }
        }

        // Standard API fallback
        if (framework === 'playwright') {
            const buf = await page.screenshot({ fullPage });
            return buf.toString('base64');
        }
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage });
        return screenshot as string;
    }

    /**
     * Take a screenshot and return as base64
     */
    async screenshot(page: Page, fullPage: boolean = false): Promise<string> {
        return this.captureScreenshot(page, fullPage);
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
     * Scroll the page — uses evaluate for broad version compatibility.
     *
     * Note: Playwright uses mouse.wheel() which dispatches real wheel events (honors
     * event listeners, smooth scroll, etc.). Puppeteer uses window.scrollBy() via evaluate
     * because mouse.wheel() API changed across Puppeteer versions (v19+). The behavioral
     * difference is intentional: mouse.wheel is more realistic but scrollBy is more reliable
     * across Puppeteer versions.
     */
    async scroll(page: Page, deltaX: number, deltaY: number): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            await (page as any).mouse.wheel(deltaX, deltaY);
        } else {
            await (page as any).evaluate((dx: number, dy: number) => window.scrollBy(dx, dy), deltaX, deltaY);
        }
    }
}
