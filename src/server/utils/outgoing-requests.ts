import { AsyncLocalStorage } from 'node:async_hooks';
import diagnosticsChannel from 'node:diagnostics_channel';
import { logLine, requestLogLevel } from './log';

/** The fields of undici's request object that are logged, see https://undici.nodejs.org/#/docs/api/DiagnosticsChannel */
interface UndiciRequest {
  origin: string;
  path: string;
  method: string;
}

interface OutgoingRequest {
  start: number;
  page?: string;
  status?: number;
}

/** The path of the page being rendered, so the requests its render makes can be traced back to it */
const renderedPage = new AsyncLocalStorage<string>();

/** Runs `render` for the page at `path`: the requests it makes are logged with that `page`. */
export function renderingPage<T>(path: string, render: () => T): T {
  return renderedPage.run(path, render);
}

let subscribed = false;

/**
 * Logs every request the server makes with `fetch` (the Angular renders' API, OSRS Wiki and GitHub calls) once it has
 * finished, in the shape of the request log (`type: 'outgoing'`, the request log is `'incoming'`). `page` is the page
 * whose render made it. A request that was cancelled (the client closed the connection mid-render) is a `warn` with
 * `aborted: true` and no `status`, a network error an `error`.
 */
export function logOutgoingRequests(): void {
  if (subscribed) return;
  subscribed = true;

  const requests = new WeakMap<UndiciRequest, OutgoingRequest>();

  const log = (request: UndiciRequest, error?: Error): void => {
    const outgoing = requests.get(request);
    if (!outgoing) return;
    requests.delete(request);

    const aborted = error?.name === 'AbortError';
    process.stdout.write(
      logLine(error && !aborted ? 'error' : requestLogLevel(outgoing.status ?? 0, aborted), 'outgoing', {
        status: error ? undefined : outgoing.status?.toString(),
        aborted: aborted || undefined,
        method: request.method,
        url: request.origin + request.path,
        responseTime: (performance.now() - outgoing.start).toFixed(3) + 'ms',
        page: outgoing.page,
        error: error && !aborted ? error.message : undefined,
      }) + '\n',
    );
  };

  diagnosticsChannel.subscribe('undici:request:create', message => {
    const { request } = message as { request: UndiciRequest };
    requests.set(request, { start: performance.now(), page: renderedPage.getStore() });
  });
  diagnosticsChannel.subscribe('undici:request:headers', message => {
    const { request, response } = message as { request: UndiciRequest; response: { statusCode: number } };
    const outgoing = requests.get(request);
    if (outgoing) outgoing.status = response.statusCode;
  });
  // Published once the response body has been read, so `responseTime` includes the download
  diagnosticsChannel.subscribe('undici:request:trailers', message =>
    log((message as { request: UndiciRequest }).request),
  );
  diagnosticsChannel.subscribe('undici:request:error', message => {
    const { request, error } = message as { request: UndiciRequest; error: Error };
    log(request, error);
  });
}
