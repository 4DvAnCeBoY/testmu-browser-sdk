import { SnapshotService, SnapshotOptions, SnapshotResult, SnapshotDiff } from './snapshot-service';
import { RefStore, RefMapping } from '../stores/ref-store';
import { detectFramework } from '../utils/framework-detect';

export class PageService {
    private pageSessionMap = new WeakMap<object, string>();

    constructor(
        private snapshotService: SnapshotService,
        private refStore: RefStore,
    ) {}

    // =================== Binding ===================

    bind(page: any, sessionId: string): void {
        this.pageSessionMap.set(page, sessionId);
    }

    private getSessionId(page: any): string {
        const id = this.pageSessionMap.get(page);
        if (!id) throw new Error('Page not bound to a session. Call browser.page.bind(page, sessionId) first.');
        return id;
    }

    // =================== Snapshot ===================

    async snapshot(page: any, options?: SnapshotOptions): Promise<SnapshotResult> {
        const sessionId = this.getSessionId(page);
        return this.snapshotService.capture(page, sessionId, options);
    }

    async snapshotDiff(page: any, options?: SnapshotOptions): Promise<{ diff: SnapshotDiff, current: SnapshotResult, compactText?: string }> {
        const sessionId = this.getSessionId(page);
        const previous = this.snapshotService.getPrevious(sessionId);
        const current = await this.snapshotService.capture(page, sessionId, options);

        if (!previous) {
            return {
                diff: {
                    urlChanged: false, currentUrl: current.url,
                    added: [], removed: [], changed: [], unchanged: current.refCount,
                },
                current,
                compactText: options?.compact ? `[${current.title}] ${current.url}\n(first snapshot — no previous to diff against)` : undefined,
            };
        }

        const diff = this.snapshotService.diff(previous, current);
        return {
            diff,
            current,
            compactText: options?.compact ? this.snapshotService.diffToCompactText(diff, current.title) : undefined,
        };
    }

    // =================== Navigation ===================

    async navigate(page: any, url: string, options?: { waitUntil?: string }): Promise<{ url: string, title: string }> {
        await page.goto(url, options?.waitUntil ? { waitUntil: options.waitUntil } : undefined);
        return { url: typeof page.url === 'function' ? page.url() : url, title: await page.title() };
    }

    async back(page: any): Promise<{ url: string, title: string }> {
        await page.goBack();
        return { url: typeof page.url === 'function' ? page.url() : '', title: await page.title() };
    }

    async forward(page: any): Promise<{ url: string, title: string }> {
        await page.goForward();
        return { url: typeof page.url === 'function' ? page.url() : '', title: await page.title() };
    }

    async reload(page: any): Promise<{ url: string, title: string }> {
        await page.reload();
        return { url: typeof page.url === 'function' ? page.url() : '', title: await page.title() };
    }

    async wait(page: any, selectorOrMs: string | number): Promise<void> {
        if (typeof selectorOrMs === 'number') {
            await new Promise(resolve => setTimeout(resolve, selectorOrMs));
        } else {
            const framework = detectFramework(page);
            if (framework === 'playwright') {
                await page.locator(selectorOrMs).waitFor();
            } else {
                await page.waitForSelector(selectorOrMs);
            }
        }
    }

    // =================== Interaction ===================

    async click(page: any, selector: string, options?: { button?: string }): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        await element.click(options);
    }

    async fill(page: any, selector: string, value: string): Promise<void> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            await element.fill(value);
        } else {
            await element.type(value);
        }
    }

    async type(page: any, selector: string, text: string): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            await element.pressSequentially(text);
        } else {
            await element.type(text);
        }
    }

    async select(page: any, selector: string, ...values: string[]): Promise<void> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            await element.selectOption(values);
        } else {
            await element.select(...values);
        }
    }

    async check(page: any, selector: string): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            const element = await this.resolveSelector(page, selector);
            await element.check();
        } else {
            const element = await this.resolveSelector(page, selector);
            const checked = await element.evaluate((el: any) => el.checked);
            if (!checked) await element.click();
        }
    }

    async uncheck(page: any, selector: string): Promise<void> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            const element = await this.resolveSelector(page, selector);
            await element.uncheck();
        } else {
            const element = await this.resolveSelector(page, selector);
            const checked = await element.evaluate((el: any) => el.checked);
            if (checked) await element.click();
        }
    }

    async hover(page: any, selector: string): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        await element.hover();
    }

    async focus(page: any, selector: string): Promise<void> {
        const element = await this.resolveSelector(page, selector);
        await element.focus();
    }

    async drag(page: any, source: string, target: string): Promise<void> {
        const framework = detectFramework(page);
        const srcEl = await this.resolveSelector(page, source);
        const tgtEl = await this.resolveSelector(page, target);
        if (framework === 'playwright') {
            await srcEl.dragTo(tgtEl);
        } else {
            const srcBox = await srcEl.boundingBox();
            const tgtBox = await tgtEl.boundingBox();
            if (srcBox && tgtBox) {
                await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(tgtBox.x + tgtBox.width / 2, tgtBox.y + tgtBox.height / 2);
                await page.mouse.up();
            }
        }
    }

    async upload(page: any, selector: string, files: string[]): Promise<void> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            await element.setInputFiles(files);
        } else {
            await element.uploadFile(...files);
        }
    }

    async press(page: any, key: string): Promise<void> {
        await page.keyboard.press(key);
    }

    async scroll(page: any, options?: { selector?: string, direction?: string, amount?: number }): Promise<void> {
        const amount = options?.amount || 300;
        const direction = options?.direction || 'down';
        const deltaY = direction === 'up' ? -amount : direction === 'down' ? amount : 0;

        if (options?.selector) {
            const element = await this.resolveSelector(page, options.selector);
            await element.evaluate((el: any, dy: number) => el.scrollBy(0, dy), deltaY);
        } else {
            const deltaX = direction === 'left' ? -amount : direction === 'right' ? amount : 0;
            await page.mouse.wheel({ deltaX, deltaY });
        }
    }

    // =================== Queries ===================

    async getText(page: any, selector: string): Promise<string> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.textContent() || '';
        } else {
            return await element.evaluate((el: any) => el.textContent || '');
        }
    }

    async getHtml(page: any, selector: string): Promise<string> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.innerHTML();
        } else {
            return await element.evaluate((el: any) => el.innerHTML);
        }
    }

    async getValue(page: any, selector: string): Promise<string> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.inputValue();
        } else {
            return await element.evaluate((el: any) => el.value || '');
        }
    }

    async getAttr(page: any, selector: string, attribute: string): Promise<string | null> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.getAttribute(attribute);
        } else {
            return await element.evaluate((el: any, attr: string) => el.getAttribute(attr), attribute);
        }
    }

    async getUrl(page: any): Promise<string> {
        this.getSessionId(page);
        return typeof page.url === 'function' ? page.url() : '';
    }

    async getTitle(page: any): Promise<string> {
        this.getSessionId(page);
        return await page.title();
    }

    async getCount(page: any, selector: string): Promise<number> {
        const framework = detectFramework(page);
        if (framework === 'playwright') {
            return await page.locator(selector).count();
        } else {
            const elements = await page.$$(selector);
            return elements.length;
        }
    }

    async getBoundingBox(page: any, selector: string): Promise<{ x: number, y: number, width: number, height: number } | null> {
        const element = await this.resolveSelector(page, selector);
        return await element.boundingBox();
    }

    // =================== State Checks ===================

    async isVisible(page: any, selector: string): Promise<boolean> {
        try {
            const element = await this.resolveSelector(page, selector);
            return await element.isVisible();
        } catch {
            return false;
        }
    }

    async isHidden(page: any, selector: string): Promise<boolean> {
        return !(await this.isVisible(page, selector));
    }

    async isEnabled(page: any, selector: string): Promise<boolean> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.isEnabled();
        } else {
            return await element.evaluate((el: any) => !el.disabled);
        }
    }

    async isDisabled(page: any, selector: string): Promise<boolean> {
        return !(await this.isEnabled(page, selector));
    }

    async isChecked(page: any, selector: string): Promise<boolean> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.isChecked();
        } else {
            return await element.evaluate((el: any) => el.checked || false);
        }
    }

    async isFocused(page: any, selector: string): Promise<boolean> {
        const element = await this.resolveSelector(page, selector);
        return await element.evaluate((el: any) => document.activeElement === el);
    }

    async isEditable(page: any, selector: string): Promise<boolean> {
        const framework = detectFramework(page);
        const element = await this.resolveSelector(page, selector);
        if (framework === 'playwright') {
            return await element.isEditable();
        } else {
            return await element.evaluate((el: any) => !el.disabled && !el.readOnly);
        }
    }

    // =================== Find ===================

    async findByRole(page: any, role: string, options?: { name?: string }): Promise<{ ref: string, name: string }[]> {
        const sessionId = this.getSessionId(page);
        const stored = await this.refStore.load(sessionId);
        if (!stored) return [];
        const results: { ref: string, name: string }[] = [];
        for (const [ref, mapping] of stored.refs) {
            if (mapping.role === role) {
                if (options?.name && !mapping.name.includes(options.name)) continue;
                results.push({ ref, name: mapping.name });
            }
        }
        return results;
    }

    async findByText(page: any, text: string): Promise<{ ref: string, role: string, name: string }[]> {
        const sessionId = this.getSessionId(page);
        const stored = await this.refStore.load(sessionId);
        if (!stored) return [];
        const results: { ref: string, role: string, name: string }[] = [];
        for (const [ref, mapping] of stored.refs) {
            if (mapping.name.includes(text)) {
                results.push({ ref, role: mapping.role, name: mapping.name });
            }
        }
        return results;
    }

    async findByLabel(page: any, text: string): Promise<{ ref: string, role: string, name: string }[]> {
        return this.findByText(page, text);
    }

    // =================== Evaluate ===================

    async evaluate(page: any, script: string): Promise<any> {
        this.getSessionId(page);
        return await page.evaluate(script);
    }

    // =================== Private: Selector Resolution ===================

    private async resolveSelector(page: any, selector: string): Promise<any> {
        const framework = detectFramework(page);

        if (selector.startsWith('@e')) {
            const sessionId = this.getSessionId(page);
            const mapping = await this.refStore.get(sessionId, selector);
            if (!mapping) {
                throw new Error(`Unknown ref "${selector}". Run 'page snapshot' first to capture element refs.`);
            }
            return this.resolveRefToElement(page, mapping, selector, framework);
        }

        if (framework === 'playwright') {
            return page.locator(selector);
        } else {
            if (selector.startsWith('//') || selector.startsWith('xpath/')) {
                const xpath = selector.replace(/^xpath\//, '');
                return page.waitForSelector(`::-p-xpath(${xpath})`, { timeout: 5000 });
            }
            return page.waitForSelector(selector, { timeout: 5000 });
        }
    }

    private async resolveRefToElement(page: any, mapping: RefMapping, ref: string, framework: string): Promise<any> {
        // Step 1: Try CSS (faster than xpath)
        if (mapping.css) {
            try {
                if (framework === 'playwright') {
                    const locator = page.locator(mapping.css);
                    if (await locator.count() > 0) return locator.first();
                } else {
                    const el = await page.waitForSelector(mapping.css, { timeout: 2000 });
                    if (el) return el;
                }
            } catch { /* fall through */ }
        }

        // Step 2: Try XPath
        if (mapping.xpath) {
            try {
                if (framework === 'playwright') {
                    const locator = page.locator(`xpath=${mapping.xpath}`);
                    if (await locator.count() > 0) return locator.first();
                } else {
                    const el = await page.waitForSelector(`::-p-xpath(${mapping.xpath})`, { timeout: 2000 });
                    if (el) return el;
                }
            } catch { /* fall through */ }
        }

        // Step 3: Fuzzy match by role + name (Playwright only)
        if (framework === 'playwright' && mapping.role && mapping.name) {
            try {
                const locator = page.getByRole(mapping.role, { name: mapping.name });
                if (await locator.count() > 0) return locator.first();
            } catch { /* fall through */ }
        }

        throw new Error(
            `Element ${ref} (${mapping.role} "${mapping.name}") no longer found on page. ` +
            `Page may have changed. Run 'page snapshot' to refresh refs.`
        );
    }
}
