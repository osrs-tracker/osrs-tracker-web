import { ActivatedRouteSnapshot } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { describe, expect, it } from 'vitest';
import routes, { priceTrackerRoutes } from './price-tracker.routes';

describe('priceTrackerRoutes', () => {
  const main = priceTrackerRoutes('main');
  const hardcoreParent = main.find(route => route.path === 'hardcore')!;
  const hardcore = hardcoreParent.children!;
  const metaOf = (path: string, list = main) => list.find(route => route.path === path)?.data?.['meta'] as PageMeta;

  it('is the default export, which the trackers route loads', () => {
    expect(routes.map(route => route.path)).toEqual(main.map(route => route.path));
  });

  it('mounts Hardcore Worlds before `:id`, which would match it', () => {
    const paths = main.map(route => route.path);

    expect(paths.indexOf('hardcore')).toBeGreaterThan(-1);
    expect(paths.indexOf('hardcore')).toBeLessThan(paths.indexOf(':id'));
  });

  it('provides the Hardcore Worlds price world to its pages, and mounts them once', () => {
    expect(hardcoreParent.providers).toHaveLength(1);
    expect(hardcore.map(route => route.path)).toEqual(main.map(route => route.path).filter(p => p !== 'hardcore'));
  });

  it('gives the Hardcore Worlds pages their own title and canonical, and leaves the main ones as they were', () => {
    expect(main[0].title).toBe('OSRS Price Tracker: Live Grand Exchange prices');
    expect(metaOf('', main).canonicalPath).toBe('/trackers/price');
    expect(metaOf('margins').canonicalPath).toBe('/trackers/price/margins');

    expect(hardcore[0].title).toBe('OSRS Hardcore Worlds GE Tracker: Live Grand Exchange prices');
    expect(metaOf('', hardcore).canonicalPath).toBe('/trackers/price/hardcore');
    expect(hardcore.find(route => route.path === 'margins')!.title).toBe(
      'OSRS Hardcore Worlds GE Margins: Flips after tax',
    );
    expect(metaOf('margins', hardcore).canonicalPath).toBe('/trackers/price/hardcore/margins');
    expect(hardcore.find(route => route.path === 'high-alch')!.title).toBe('OSRS Hardcore Worlds High Alch Profit');
    expect(hardcore.find(route => route.path === 'new')!.title).toBe('New OSRS Hardcore Worlds GE items');
    expect(metaOf('high-alch', hardcore).canonicalPath).toBe('/trackers/price/hardcore/high-alch');
    expect(metaOf('new', hardcore).canonicalPath).toBe('/trackers/price/hardcore/new');
  });

  it('puts Hardcore Worlds in the breadcrumbs of its pages', () => {
    const crumbs = (meta: PageMeta) =>
      (meta.jsonLd![0]['itemListElement'] as { name: string }[]).map(crumb => crumb.name);

    expect(crumbs(metaOf('margins'))).toEqual(['Home', 'Price Tracker', 'Margins']);
    expect(crumbs(metaOf('', hardcore))).toEqual(['Home', 'Price Tracker', 'Hardcore Worlds']);
    expect(crumbs(metaOf('margins', hardcore))).toEqual(['Home', 'Price Tracker', 'Hardcore Worlds', 'Margins']);
  });

  it('describes the landings with breadcrumbs only: Google no longer shows FAQ rich results', () => {
    const types = (meta: PageMeta) => meta.jsonLd!.map(node => node['@type']);

    expect(types(metaOf('', hardcore))).toEqual(['BreadcrumbList']);
    expect(types(metaOf('', main))).toEqual(['BreadcrumbList']);
    expect(metaOf('', hardcore).description).toMatch(/^The OSRS Hardcore Worlds GE tracker: live prices/);
  });

  it('builds the browse and item metas for the world', () => {
    const route = (params: object, data: object = {}) => ({ params, data }) as unknown as ActivatedRouteSnapshot;
    const meta = (list: typeof main, path: string, snapshot: ActivatedRouteSnapshot) =>
      (list.find(r => r.path === path)!.data!['meta'] as (route: ActivatedRouteSnapshot) => PageMeta)(snapshot)!;

    expect(meta(hardcore, 'browse/:letter', route({ letter: 'a' }))).toMatchObject({
      title: 'OSRS Hardcore Worlds items starting with A',
      canonicalPath: '/trackers/price/hardcore/browse/a',
    });
    expect(meta(main, 'browse/:letter', route({ letter: 'a' })).canonicalPath).toBe('/trackers/price/browse/a');
    expect(
      meta(hardcore, ':id', route({}, { item: { id: 4151, name: 'Abyssal whip', examine: 'x.', icon: 'a.png' } })),
    ).toMatchObject({
      canonicalPath: '/trackers/price/hardcore/4151',
    });
  });
});
