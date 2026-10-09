/**
 * What a server log line is about, so Loki queries can pick one kind (`| json | type="outgoing"`):
 * - `incoming`: a request the server answered (`middleware/logging.ts`)
 * - `outgoing`: a request a page render made (`utils/outgoing-requests.ts`)
 * - `lifecycle`: startup and shutdown
 * - `prerender`: auto page generation (`utils/auto-generator.ts`)
 * - `uncaught`: an error that reached Express' error handler
 */
export type LogType = 'incoming' | 'outgoing' | 'lifecycle' | 'prerender' | 'uncaught';
export type LogLevel = 'info' | 'warn' | 'error';

/** 5xx is `error`; 4xx and aborted requests (no response) are `warn`; else `info`. For both request logs. */
export function requestLogLevel(status: number, aborted: boolean): LogLevel {
  return aborted ? 'warn' : status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
}

/** One JSON log line: `level`, `time` and `type` first, then `fields` (`undefined` ones are left out). */
export function logLine(level: LogLevel, type: LogType, fields: Record<string, unknown>): string {
  return JSON.stringify({ level, time: new Date().toISOString(), type, ...fields });
}

/** Writes a log line to stdout, as morgan does. An `error` is logged with its stack, on the same line. */
export function writeLog(level: LogLevel, type: LogType, message: string, error?: unknown): void {
  process.stdout.write(logLine(level, type, { message, error: errorText(error) }) + '\n');
}

function errorText(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
