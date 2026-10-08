import { Express } from 'express';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterAll } from 'vitest';

/**
 * Starts the app on a random port for the current spec file and returns a `fetch` for paths on it.
 * The server is closed after all tests in the file.
 */
export function serve(app: Express): (path: string, init?: RequestInit) => Promise<Response> {
  const server = createServer(app).listen(0);
  afterAll(() => new Promise(resolve => server.close(resolve)));

  return (path, init) =>
    fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, { redirect: 'manual', ...init });
}
