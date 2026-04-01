process.stdout.on('error', (err: any) => {
    if (err.code === 'EPIPE') process.exit(0);
});
process.stderr.on('error', (err: any) => {
    if (err.code === 'EPIPE') process.exit(0);
});

export class Output {
  private static pretty = false;

  static setPretty(value: boolean): void {
    Output.pretty = value;
  }

  /**
   * Redact sensitive values (access keys, passwords) from output.
   * Replaces any string that looks like an access key with a masked version.
   */
  private static redact(data: unknown): unknown {
    const str = JSON.stringify(data);
    // Redact credentials in wss:// and ws:// URLs structurally (user:pass@host)
    const redacted = str.replace(
      /(wss?:\/\/)([^@]+)(@)/g,
      '$1****:****$3'
    ).replace(
      // Redact accessKey field values (any length)
      /("accessKey"\s*:\s*")([^"]+)(")/g,
      '$1****$3'
    ).replace(
      // Redact password field values (any length)
      /("password"\s*:\s*")([^"]+)(")/g,
      '$1****$3'
    ).replace(
      // Redact access keys in URL-encoded JSON (%22accessKey%22%3A%22VALUE%22)
      /(accessKey%22%3A%22)([^%"]+)(%22)/g,
      '$1****$3'
    ).replace(
      // Redact password in URL-encoded JSON
      /(password%22%3A%22)([^%"]+)(%22)/g,
      '$1****$3'
    );
    return JSON.parse(redacted);
  }

  static json(data: unknown, pretty?: boolean): void {
    const usePretty = pretty ?? Output.pretty;
    const safe = Output.redact(data);
    const str = usePretty
      ? JSON.stringify(safe, null, 2)
      : JSON.stringify(safe);
    process.stdout.write(str + '\n');
  }

  static success(data: unknown): void {
    Output.json({ success: true, data });
  }

  static error(message: string, details?: unknown): void {
    const output = { success: false, error: message, ...(details ? { details } : {}) };
    const safe = Output.redact(output);
    const str = Output.pretty
      ? JSON.stringify(safe, null, 2)
      : JSON.stringify(safe);
    process.stderr.write(str + '\n');
  }
}
