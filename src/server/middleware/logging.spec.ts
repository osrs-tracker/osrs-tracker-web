// @vitest-environment node
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serve } from '../testing/serve';
import { loggingMiddleware } from './logging';

describe('loggingMiddleware', () => {
  let received: () => void;
  const app = express()
    .use(loggingMiddleware())
    .get('/ok', (_req, res) => void res.send('ok'))
    .get('/missing', (_req, res) => void res.status(404).send('not found'))
    .get('/fail', (_req, res) => void res.status(500).send('error'))
    .get('/slow', () => received()); // Never answers, like a page render the client gives up on
  const get = serve(app);

  const logs = (): Record<string, unknown>[] =>
    vi.mocked(process.stdout.write).mock.calls.map(([line]) => JSON.parse(String(line)));

  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['/ok', 'info', '200'],
    ['/missing', 'warn', '404'],
    ['/fail', 'error', '500'],
  ])('logs a completed request to %s at %s with its status', async (path, level, status) => {
    await (await get(path)).text();

    await vi.waitFor(() => expect(logs()).toHaveLength(1));
    expect(logs()[0]).toMatchObject({ level, status, url: path, responseTime: expect.stringMatching(/^[\d.]+ms$/) });
    expect(logs()[0]).not.toHaveProperty('aborted');
  });

  it('logs a request the client aborted before the headers were sent as a warning, without a status', async () => {
    const controller = new AbortController();
    const handled = new Promise<void>(resolve => (received = resolve));

    const request = get('/slow', { signal: controller.signal }).catch(() => undefined);
    await handled;
    controller.abort();
    await request;

    await vi.waitFor(() => expect(logs()).toHaveLength(1));
    expect(logs()[0]).toMatchObject({
      level: 'warn',
      aborted: true,
      url: '/slow',
      responseTime: expect.stringMatching(/^[\d.]+ms$/),
    });
    expect(logs()[0]).not.toHaveProperty('status');
  });
});
