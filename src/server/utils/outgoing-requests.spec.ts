// @vitest-environment node
import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { serve } from '../testing/serve';
import { logOutgoingRequests, renderingPage } from './outgoing-requests';

describe('logOutgoingRequests', () => {
  let received: () => void;
  const get = serve(
    express()
      .get('/ok', (_req, res) => void res.send('ok'))
      .get('/fail', (_req, res) => void res.status(500).send('error'))
      .get('/slow', () => received()), // Never answers, like a Wiki that's down
  );

  const logs = (): Record<string, unknown>[] =>
    vi
      .mocked(process.stdout.write)
      .mock.calls.map(([line]) => JSON.parse(String(line)))
      .filter(log => log.type === 'outgoing');

  beforeAll(() => logOutgoingRequests());
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['/ok', 'info', '200'],
    ['/fail', 'error', '500'],
  ])('logs a finished request to %s at %s, with the page whose render made it', async (path, level, status) => {
    await renderingPage('/trackers/price/4151', async () => (await get(path)).text());

    await vi.waitFor(() => expect(logs()).toHaveLength(1));
    expect(logs()[0]).toMatchObject({
      level,
      status,
      method: 'GET',
      url: expect.stringMatching(new RegExp(`^http://127\\.0\\.0\\.1:\\d+${path}$`)),
      responseTime: expect.stringMatching(/^[\d.]+ms$/),
      page: '/trackers/price/4151',
    });
  });

  it('logs a cancelled request as a warning, without a status', async () => {
    const controller = new AbortController();
    const handled = new Promise<void>(resolve => (received = resolve));
    const request = get('/slow', { signal: controller.signal }).catch(() => undefined);
    await handled;

    controller.abort();
    await request;

    await vi.waitFor(() => expect(logs()).toHaveLength(1));
    expect(logs()[0]).toMatchObject({ level: 'warn', aborted: true });
    expect(logs()[0]).not.toHaveProperty('status');
    expect(logs()[0]).not.toHaveProperty('page');
  });
});
