import { Route, Routes } from '@angular/router';
import { Request, Response } from 'express';
import appRoutes from '@app/app.routes';
import { describe, expect, it } from 'vitest';
import { routeLabel } from './route-label';

function label(url: string, statusCode = 200): string {
  return routeLabel({ originalUrl: url } as Request, { statusCode } as Response);
}

/** The full path of every page in the Angular route table, lazy children included */
async function pagePaths(routes: Routes, parent = ''): Promise<string[]> {
  const paths: string[] = [];

  for (const route of routes) {
    if (route.path === '**') continue;
    const path = [parent, route.path].filter(Boolean).join('/');

    const children = route.children ?? (await loadChildren(route));
    if (children) paths.push(...(await pagePaths(children, path)));
    else paths.push('/' + path);
  }

  return paths;
}

async function loadChildren(route: Route): Promise<Routes | undefined> {
  const loaded = (await route.loadChildren?.()) as Routes | { default: Routes } | undefined;
  return loaded && 'default' in loaded ? loaded.default : loaded;
}

describe('routeLabel', () => {
  it('labels every page in the Angular route table with its route', async () => {
    const paths = await pagePaths(appRoutes);
    expect(paths.length).toBeGreaterThan(5);

    for (const path of paths) {
      expect(label(path.replace(/:[^/]+/g, 'x')), path).toBe(path);
    }
  });

  it.each([
    ['/trackers/xp/the%20fraking', '/trackers/xp/:username'],
    ['/trackers/xp/ToxSick/', '/trackers/xp/:username'],
    ['/trackers/price/4151?range=week', '/trackers/price/:id'],
    ['/trackers/price/browse', '/trackers/price/browse'],
    ['/trackers/price/browse/a', '/trackers/price/browse/:letter'],
    ['/trackers/xp/a/b', '#unmatched'],
    ['/main-ABC123.js', '/static'],
  ])('labels %s as %s', (url, expected) => {
    expect(label(url)).toBe(expected);
  });

  it('labels missing files as unmatched, so 404 scans do not count as static files', () => {
    expect(label('/wp-login.php', 404)).toBe('#unmatched');
  });
});
