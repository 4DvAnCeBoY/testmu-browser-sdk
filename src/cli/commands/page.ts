import { Command } from 'commander';
import { Output } from '../output';
import { getSessionPage, createPageService, resolveSessionId, savePreviousSnapshot, loadPreviousSnapshot, savePageState, DEFAULT_CLIENT_ID } from '../page-manager';
import { NetworkService } from '../../testmu-cloud/services/network-service';

async function withSession(options: any, fn: (pageService: any, browserPage: any) => Promise<any>) {
    const sessionId = await resolveSessionId(options.session);
    const clientId: string | undefined = options.clientId ?? DEFAULT_CLIENT_ID;
    const { page: browserPage, cleanup } = await getSessionPage(sessionId, {
        noAutoNavigate: options.noAutoNavigate,
        clientId,
    });
    const { pageService } = createPageService();
    pageService.bind(browserPage, sessionId);
    pageService.setClientId(clientId!);
    try {
        await fn(pageService, browserPage);
    } finally {
        await cleanup();
    }
}

export function registerPageCommand(program: Command): void {
    const page = program.command('page').description('Page interaction and snapshot tools (selector-based)')
        .option('--no-auto-navigate', 'Skip auto-navigating to last known URL on reconnect');

    // =================== Snapshot ===================
    page
        .command('snapshot')
        .description('Capture accessibility tree with @ref element IDs')
        .option('--session <id>', 'Session ID')
        .option('--compact', 'Token-efficient text output')
        .option('--max-elements <n>', 'Max refs to assign (default: 500)')
        .option('--diff', 'Show changes since last snapshot')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            const clientId: string = options.clientId ?? DEFAULT_CLIENT_ID;
            try {
                await withSession(options, async (pageService, browserPage) => {
                    const sessionId = await resolveSessionId(options.session);
                    const snapshotOpts = {
                        compact: options.compact,
                        maxElements: options.maxElements ? parseInt(options.maxElements) : undefined,
                    };
                    if (options.diff) {
                        // Load previous snapshot from disk for cross-process diff support
                        const prevSnapshot = await loadPreviousSnapshot(sessionId, clientId);
                        if (prevSnapshot) {
                            const { snapshotService } = createPageService();
                            snapshotService.setPrevious(sessionId, prevSnapshot);
                        }
                        const { diff, current, compactText } = await pageService.snapshotDiff(browserPage, snapshotOpts);
                        await savePreviousSnapshot(sessionId, current, clientId);
                        if (options.compact && compactText) {
                            process.stdout.write(compactText + '\n');
                        } else {
                            Output.success(diff);
                        }
                    } else {
                        const result = await pageService.snapshot(browserPage, snapshotOpts);
                        await savePreviousSnapshot(sessionId, result, clientId);
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
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (url: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => {
                    const result = await ps.navigate(bp, url);
                    const sessionId = await resolveSessionId(options.session);
                    const clientId: string | undefined = options.clientId ?? DEFAULT_CLIENT_ID;
                    await savePageState(sessionId, result.url, clientId);
                    Output.success(result);
                });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('back').description('Navigate back').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.back(bp)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('forward').description('Navigate forward').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.forward(bp)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('reload').description('Reload page').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.reload(bp)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('wait <selectorOrMs>').description('Wait for element or milliseconds').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selectorOrMs: string, options: any) => {
            try {
                const value = /^\d+$/.test(selectorOrMs) ? parseInt(selectorOrMs) : selectorOrMs;
                await withSession(options, async (ps, bp) => { await ps.wait(bp, value); Output.success({ waited: selectorOrMs }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Interaction ===================
    page.command('click <selector>').description('Click element by @ref or CSS selector').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.click(bp, selector); Output.success({ clicked: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('fill <selector> <value>').description('Fill input by @ref or CSS selector').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, value: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.fill(bp, selector, value); Output.success({ filled: selector, value }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('select <selector> <values...>').description('Select dropdown option').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, values: string[], options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.select(bp, selector, ...values); Output.success({ selected: selector, values }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('check <selector>').description('Check checkbox').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.check(bp, selector); Output.success({ checked: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('uncheck <selector>').description('Uncheck checkbox').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.uncheck(bp, selector); Output.success({ unchecked: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('hover <selector>').description('Hover element').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.hover(bp, selector); Output.success({ hovered: selector }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    page.command('press <key>').description('Press keyboard key').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (key: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => { await ps.press(bp, key); Output.success({ pressed: key }); });
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Queries ===================
    const get = page.command('get').description('Query element properties');

    get.command('text <selector>').description('Get element text').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ text: await ps.getText(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('html <selector>').description('Get element HTML').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ html: await ps.getHtml(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('value <selector>').description('Get input value').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ value: await ps.getValue(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('attr <selector> <attribute>').description('Get element attribute').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, attribute: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ attribute, value: await ps.getAttr(bp, selector, attribute) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('url').description('Get current URL').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ url: await ps.getUrl(bp) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    get.command('title').description('Get page title').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ title: await ps.getTitle(bp) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== State Checks ===================
    const is = page.command('is').description('Check element state');

    is.command('visible <selector>').description('Check if element is visible').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ visible: await ps.isVisible(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    is.command('enabled <selector>').description('Check if element is enabled').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ enabled: await ps.isEnabled(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    is.command('checked <selector>').description('Check if element is checked').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (selector: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({ checked: await ps.isChecked(bp, selector) }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Find ===================
    const find = page.command('find').description('Find elements by role, text, or label');

    find.command('role <role>').description('Find elements by ARIA role').option('--session <id>', 'Session ID').option('--name <name>', 'Filter by name')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (role: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.findByRole(bp, role, options.name ? { name: options.name } : undefined)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    find.command('text <text>').description('Find elements by text content').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (text: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.findByText(bp, text)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    find.command('label <text>').description('Find elements by label').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (text: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success(await ps.findByLabel(bp, text)));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Eval ===================
    page.command('eval <script>').description('Execute JavaScript in page context (requires --allow-unsafe for sensitive APIs)')
        .option('--session <id>', 'Session ID')
        .option('--allow-unsafe', 'Allow scripts accessing cookies, storage, fetch, and other sensitive browser APIs')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (script: string, options: any) => {
            try {
                await withSession(options, async (ps, bp) => Output.success({
                    result: await ps.evaluate(bp, script, { allowUnsafe: options.allowUnsafe }),
                }));
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    // =================== Network ===================
    const network = page.command('network').description('Network request control');
    const networkService = new NetworkService();

    network.command('block <pattern>').description('Block requests matching URL pattern').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (pattern: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                try {
                    await networkService.block(bp, sessionId, pattern);
                    Output.success({ blocked: pattern });
                } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    network.command('mock <url> <responseBody>').description('Mock URL with custom response').option('--session <id>', 'Session ID').option('--status <code>', 'HTTP status code', '200')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (url: string, responseBody: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                try {
                    await networkService.mock(bp, sessionId, url, { status: parseInt(options.status), body: responseBody });
                    Output.success({ mocked: url, status: parseInt(options.status) });
                } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    network.command('headers <json>').description('Set extra HTTP headers (JSON string)').option('--session <id>', 'Session ID')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (json: string, options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const { page: bp, cleanup } = await getSessionPage(sessionId);
                try {
                    const headers = JSON.parse(json);
                    await networkService.setHeaders(bp, headers);
                    Output.success({ headers: Object.keys(headers) });
                } finally { await cleanup(); }
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });

    network.command('logs').description('Get network request logs').option('--session <id>', 'Session ID').option('--method <method>', 'Filter by HTTP method').option('--url <pattern>', 'Filter by URL pattern')
        .option('--client-id <id>', 'Client ID for session isolation (default: auto-generated from PID)')
        .action(async (options: any) => {
            try {
                const sessionId = await resolveSessionId(options.session);
                const logs = networkService.getLogs(sessionId, {
                    method: options.method,
                    urlPattern: options.url,
                });
                Output.success(logs);
            } catch (err) { Output.error(err instanceof Error ? err.message : String(err)); process.exit(1); }
        });
}
