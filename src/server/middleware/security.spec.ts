// @vitest-environment node
import { Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { securityMiddleware } from './security';

// Called directly on a bare Node response, which has the header methods helmet uses
async function scriptSrc(): Promise<string | undefined> {
  const req = new IncomingMessage(new Socket());
  const res = Object.assign(new ServerResponse(req), { locals: { cspNonce: 'abc' } });
  await new Promise(next => securityMiddleware()(req as Request, res as unknown as Response, next));
  return String(res.getHeader('content-security-policy'))
    .split(';')
    .find(directive => directive.startsWith('script-src '));
}

describe('securityMiddleware', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs only the scripts that carry the response's nonce, or that one of them adds", async () => {
    vi.stubGlobal('ngDevMode', false); // as in the production build

    expect(await scriptSrc()).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic' https://www.googletagmanager.com");
  });

  it("lets the dev server's Vite client script run, which has no nonce", async () => {
    vi.stubGlobal('ngDevMode', true); // as under `ng serve`

    expect(await scriptSrc()).toBe("script-src 'self' 'nonce-abc' https://www.googletagmanager.com");
  });
});
