import { createLogger, type CreateLoggerOptions, type Logger, type LogType } from '@osrs-tracker/logger';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * What a server log line is about (`| json | type="outgoing"` in Loki): the package's `incoming`, `outgoing`,
 * `lifecycle` and `uncaught`, plus `prerender` for auto page generation (`utils/auto-generator.ts`).
 */
export type WebLogType = LogType<'prerender'>;

/** The path of the page being rendered, so the requests its render makes can be traced back to it */
const renderedPage = new AsyncLocalStorage<string>();

/** Runs `render` for the page at `path`: the requests it makes are logged with that `page`. */
export function renderingPage<T>(path: string, render: () => T): T {
  return renderedPage.run(path, render);
}

/** The server's logger, writing to stdout unless specs pass a `destination`. Lines made during a render get its `page`. */
export function createServerLogger(destination?: CreateLoggerOptions['destination']): Logger {
  return createLogger({ context: () => ({ page: renderedPage.getStore() }), destination });
}

export const logger = createServerLogger();
