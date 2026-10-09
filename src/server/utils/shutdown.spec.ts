// @vitest-environment node
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { serverConfig } from '../server-config';
import { closeServers } from './shutdown';

const listen = (server: Server) => new Promise<Server>(resolve => server.listen(0, () => resolve(server)));
const url = (server: Server) => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

describe('closeServers', () => {
  it('closes a connection whose response was in flight, then the metrics server', async () => {
    let respond!: () => void;
    let received!: () => void;
    const requestReceived = new Promise<void>(resolve => (received = resolve));
    const main = createServer((_req, res) => {
      respond = () => res.end('ok');
      received();
    });
    main.keepAliveTimeout = serverConfig.keepAliveTimeout;
    await listen(main);
    const metrics = await listen(createServer((_req, res) => res.end('OK')));

    const response = fetch(url(main)); // fetch keeps the connection alive after the response
    await requestReceived;

    const closed: string[] = [];
    main.on('close', () => closed.push('main'));
    metrics.on('close', () => closed.push('metrics'));
    const closing = closeServers(main, metrics);

    // The metrics server keeps answering while the main server drains
    expect(await (await fetch(url(metrics))).text()).toBe('OK');

    respond();
    expect(await (await response).text()).toBe('ok');
    const start = performance.now();
    await closing;

    expect(performance.now() - start).toBeLessThan(1000); // not the 95 s keep-alive
    expect(closed).toEqual(['main', 'metrics']);
  });
});
