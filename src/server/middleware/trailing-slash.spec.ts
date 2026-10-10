// @vitest-environment node
import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { trailingSlashMiddleware } from './trailing-slash';

// Called directly, as `fetch` turns `\` into `/` and collapses some paths before they reach the server
function run(originalUrl: string, method = 'GET') {
  const path = originalUrl.split('?')[0];
  const redirect = vi.fn();
  const next = vi.fn();
  trailingSlashMiddleware()({ method, path, originalUrl } as Request, { redirect } as unknown as Response, next);
  return { redirect, next };
}

describe('trailingSlashMiddleware', () => {
  it('redirects to the path without trailing slashes, keeping the query string', () => {
    expect(run('/trackers/price/4151/?q=x').redirect).toHaveBeenCalledWith(301, '/trackers/price/4151?q=x');
    expect(run('/about/terms///', 'HEAD').redirect).toHaveBeenCalledWith(301, '/about/terms');
    expect(run('/a\\b/').redirect).toHaveBeenCalledWith(301, '/a\\b');
  });

  it('leaves the root, paths without a trailing slash and other methods alone', () => {
    for (const { redirect, next } of [run('/'), run('/about/terms?x=/'), run('/about/terms/', 'POST')]) {
      expect(redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    }
  });

  it('never redirects to another host', () => {
    for (const url of ['//evil.com/', '/\\evil.com/', '//', '/\\/']) {
      const { redirect, next } = run(url);

      expect(redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    }
  });
});
