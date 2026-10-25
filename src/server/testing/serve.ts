import { Express } from 'express';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterAll } from 'vitest';

export function serve(app: Express): (path: string, init?: RequestInit) => Promise<Response> {
  const server = createServer(app).listen(0);
  afterAll(() => new Promise(resolve => server.close(resolve)));

  return (path, init) =>
    fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, { redirect: 'manual', ...init });
}
