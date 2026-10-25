import { createLogger, type CreateLoggerOptions, type Logger, type LogType } from '@osrs-tracker/logger';
import { AsyncLocalStorage } from 'node:async_hooks';

/** What a log line is about, as filtered in Loki: `| json | type="outgoing"` */
export type WebLogType = LogType<'prerender' | 'sitemap' | 'og-image'>;

/** The path of the page being rendered, so the requests its render makes can be traced back to it */
const renderedPage = new AsyncLocalStorage<string>();

export function renderingPage<T>(path: string, render: () => T): T {
  return renderedPage.run(path, render);
}

export function createServerLogger(destination?: CreateLoggerOptions['destination']): Logger {
  return createLogger({ context: () => ({ page: renderedPage.getStore() }), destination });
}

export const logger = createServerLogger();
