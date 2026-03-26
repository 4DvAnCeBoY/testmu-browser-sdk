export class Output {
  private static pretty = false;

  static setPretty(value: boolean): void {
    Output.pretty = value;
  }

  static json(data: unknown, pretty?: boolean): void {
    const usePretty = pretty ?? Output.pretty;
    const str = usePretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    process.stdout.write(str + '\n');
  }

  static success(data: unknown): void {
    Output.json({ success: true, data });
  }

  static error(message: string, details?: unknown): void {
    const output = { success: false, error: message, ...(details ? { details } : {}) };
    const str = Output.pretty
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
    process.stderr.write(str + '\n');
  }
}
