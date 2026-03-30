import { Command } from 'commander';
import { Output } from '../output';
import { getSessionPage, createPageService, resolveSessionId } from '../page-manager';

async function withSession(options: any, fn: (pageService: any, browserPage: any) => Promise<any>) {
    const sessionId = await resolveSessionId(options.session);
    const { page: browserPage, cleanup } = await getSessionPage(sessionId);
    const { pageService } = createPageService();
    pageService.bind(browserPage, sessionId);
    try {
        await fn(pageService, browserPage);
    } finally {
        await cleanup();
    }
}

export function registerPageCommand(program: Command): void {
    const page = program.command('page').description('Page interaction and snapshot tools (selector-based)');

    // =================== Snapshot ===================
    page
        .command('snapshot')
        .description('Capture accessibility tree with @ref element IDs')
        .option('--session <id>', 'Session ID')
        .option('--compact', 'Token-efficient text output')
        .option('--interactive-only', 'Only include interactive elements')
        .option('--max-elements <n>', 'Max refs to assign (default: 500)')
        .option('--diff', 'Show changes since last snapshot')
        .action(async (options: any) => {
            try {
                await withSession(options, async (pageService, browserPage) => {
                    const snapshotOpts = {
                        compact: options.compact,
                        interactiveOnly: options.interactiveOnly,
                        maxElements: options.maxElements ? parseInt(options.maxElements) : undefined,
                    };
                    if (options.diff) {
                        const { diff, compactText } = await pageService.snapshotDiff(browserPage, snapshotOpts);
                        if (options.compact && compactText) {
                            process.stdout.write(compactText + '\n');
                        } else {
                            Output.success(diff);
                        }
                    } else {
                        const result = await pageService.snapshot(browserPage, snapshotOpts);
                        if (options.compact && result.compactText) {
                            process.stdout.write(result.compactText + '\n');
                        } else {
                            Output.success(result);
                        }
                    }
                });
            } catch (err) {
                Output.error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });

    // =================== Navigation ===================
    page
        .command('navigate <url>')
        .description('Navigate to URL')
        .option('--session <id>', 'Session ID')
        .action(async (url: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.navigate(bp, url)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('back').description('Navigate back').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.back(bp)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('forward').description('Navigate forward').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.forward(bp)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('reload').description('Reload page').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.reload(bp)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('wait <selectorOrMs>').description('Wait for element or milliseconds').option('--session <id>', 'Session ID')
        .action(async (selectorOrMs: string, options: any) => {
            try {
                const value = /^\d+$/.test(selectorOrMs) ? parseInt(selectorOrMs) : selectorOrMs;
                await withSession(options, async (ps, bp) => { await ps.wait(bp, value); Output.success({ waited: selectorOrMs }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Interaction ===================
    page.command('click <selector>').description('Click element by @ref or CSS selector').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.click(bp, selector); Output.success({ clicked: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('fill <selector> <value>').description('Fill input by @ref or CSS selector').option('--session <id>', 'Session ID')
        .action(async (selector: string, value: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.fill(bp, selector, value); Output.success({ filled: selector, value }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('select <selector> <values...>').description('Select dropdown option').option('--session <id>', 'Session ID')
        .action(async (selector: string, values: string[], options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.select(bp, selector, ...values); Output.success({ selected: selector, values }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('check <selector>').description('Check checkbox').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.check(bp, selector); Output.success({ checked: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('uncheck <selector>').description('Uncheck checkbox').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.uncheck(bp, selector); Output.success({ unchecked: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('hover <selector>').description('Hover element').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.hover(bp, selector); Output.success({ hovered: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('press <key>').description('Press keyboard key').option('--session <id>', 'Session ID')
        .action(async (key: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.press(bp, key); Output.success({ pressed: key }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Queries ===================
    const get = page.command('get').description('Query element properties');

    get.command('text <selector>').description('Get element text').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ text: await ps.getText(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('html <selector>').description('Get element HTML').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ html: await ps.getHtml(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('value <selector>').description('Get input value').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ value: await ps.getValue(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('attr <selector> <attribute>').description('Get element attribute').option('--session <id>', 'Session ID')
        .action(async (selector: string, attribute: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ attribute, value: await ps.getAttr(bp, selector, attribute) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('url').description('Get current URL').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ url: await ps.getUrl(bp) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('title').description('Get page title').option('--session <id>', 'Session ID')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ title: await ps.getTitle(bp) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== State Checks ===================
    const is = page.command('is').description('Check element state');

    is.command('visible <selector>').description('Check if element is visible').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ visible: await ps.isVisible(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    is.command('enabled <selector>').description('Check if element is enabled').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ enabled: await ps.isEnabled(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    is.command('checked <selector>').description('Check if element is checked').option('--session <id>', 'Session ID')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ checked: await ps.isChecked(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Find ===================
    const find = page.command('find').description('Find elements by role, text, or label');

    find.command('role <role>').description('Find elements by ARIA role').option('--session <id>', 'Session ID').option('--name <name>', 'Filter by name')
        .action(async (role: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.findByRole(bp, role, options.name ? { name: options.name } : undefined)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    find.command('text <text>').description('Find elements by text content').option('--session <id>', 'Session ID')
        .action(async (text: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.findByText(bp, text)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    find.command('label <text>').description('Find elements by label').option('--session <id>', 'Session ID')
        .action(async (text: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.findByLabel(bp, text)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Eval ===================
    page.command('eval <script>').description('Execute JavaScript in page context').option('--session <id>', 'Session ID')
        .action(async (script: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ result: await ps.evaluate(bp, script) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });
}
