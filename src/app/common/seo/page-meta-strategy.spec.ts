import { Component, DOCUMENT, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, provideRouter, Router, TitleStrategy } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DESCRIPTION, PageMeta, PageMetaStrategy, RouteMeta } from './page-meta-strategy';

@Component({ template: '' })
class PageComponent {}

const itemMeta: PageMeta = {
  description: 'Abyssal whip prices',
  canonicalPath: '/items/4151',
  jsonLd: [{ '@type': 'Thing', 'name': 'Abyssal whip </script><script>alert(1)</script>' }],
};
const listMeta: PageMeta = {
  description: 'All item prices',
  canonicalPath: '/items',
  jsonLd: [{ '@type': 'WebPage', 'name': 'All items' }],
};

/** Like an item or player page: meta from what the route's resolver found, none for a name it didn't */
const playerMeta: RouteMeta = (route: ActivatedRouteSnapshot) => {
  const player: string | null = route.data['player'];
  return player
    ? { title: `${player} stats`, description: `Stats of ${player}`, canonicalPath: `/players/${player}` }
    : undefined;
};

describe('PageMetaStrategy', () => {
  const errorHandler = { handleError: vi.fn() };
  let router: Router;
  let meta: Meta;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLocationMocks(),
        provideRouter([
          { path: 'items', title: 'Items', component: PageComponent, data: { meta: listMeta } },
          {
            path: 'about',
            title: 'About',
            component: PageComponent,
            data: { meta: { description: 'About', canonicalPath: '/about' } satisfies PageMeta },
          },
          { path: 'items/:id', title: 'Whip', component: PageComponent, data: { meta: itemMeta } },
          {
            path: 'players/:name',
            title: 'Player not found',
            component: PageComponent,
            data: { meta: playerMeta },
            resolve: {
              player: (route: ActivatedRouteSnapshot) =>
                route.params['name'] === 'nobody' ? null : route.params['name'],
            },
          },
          {
            path: 'broken',
            title: 'Broken',
            component: PageComponent,
            data: {
              meta: (() => {
                throw new Error('bad data');
              }) satisfies RouteMeta,
            },
          },
          { path: '**', title: 'Not found', component: PageComponent },
        ]),
        { provide: TitleStrategy, useClass: PageMetaStrategy },
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    });
    router = TestBed.inject(Router);
    meta = TestBed.inject(Meta);
    document = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    document.head
      .querySelectorAll('link[rel="canonical"], meta[name], meta[property], script')
      .forEach(el => el.remove());
  });

  const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const description = () => meta.getTag('name="description"')?.content;
  const jsonLdScripts = () => document.head.querySelectorAll('script[type="application/ld+json"]');

  it('sets the description, canonical and social tags of the page', async () => {
    await router.navigateByUrl('/items/4151?q=whip');

    expect(document.title).toBe('Whip');
    expect(description()).toBe('Abyssal whip prices');
    expect(canonical()).toBe('https://osrs-tracker.net/items/4151');
    expect(meta.getTag('property="og:title"')?.content).toBe('Whip');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://osrs-tracker.net/items/4151');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
  });

  it('replaces the previous page description and canonical, without duplicating tags', async () => {
    await router.navigateByUrl('/items/4151');
    await router.navigateByUrl('/items');

    expect(description()).toBe('All item prices');
    expect(canonical()).toBe('https://osrs-tracker.net/items');
    expect(meta.getTags('name="description"')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('removes the canonical and social tags on a page without meta', async () => {
    await router.navigateByUrl('/items/4151');
    await router.navigateByUrl('/nope');

    expect(description()).toBe(DEFAULT_DESCRIPTION);
    expect(canonical()).toBeUndefined();
    expect(meta.getTag('property="og:title"')).toBeNull();
    expect(meta.getTag('property="og:image"')).toBeNull();
    expect(meta.getTag('name="twitter:card"')).toBeNull();
  });

  it("builds a route's meta from its resolved data, with the meta's title over the route's", async () => {
    await router.navigateByUrl('/players/zezima');

    expect(document.title).toBe('zezima stats');
    expect(TestBed.inject(TitleStrategy).buildTitle(router.routerState.snapshot)).toBe('zezima stats');
    expect(meta.getTag('property="og:title"')?.content).toBe('zezima stats');
    expect(description()).toBe('Stats of zezima');
    expect(canonical()).toBe('https://osrs-tracker.net/players/zezima');
  });

  it("uses the route's title and no canonical when the meta function returns none", async () => {
    await router.navigateByUrl('/players/zezima');
    await router.navigateByUrl('/players/nobody');

    expect(document.title).toBe('Player not found');
    expect(description()).toBe(DEFAULT_DESCRIPTION);
    expect(canonical()).toBeUndefined();
  });

  it('reports a meta function that throws, and still completes the navigation without meta', async () => {
    await router.navigateByUrl('/items/4151');

    expect(await router.navigateByUrl('/broken')).toBe(true);
    expect(document.title).toBe('Broken');
    expect(canonical()).toBeUndefined();
    expect(errorHandler.handleError).toHaveBeenCalledWith(new Error('bad data'));
  });

  it('replaces the JSON-LD on navigation, escaped so a name cannot close the script', async () => {
    await router.navigateByUrl('/items/4151');
    expect(jsonLdScripts()).toHaveLength(1);
    expect(jsonLdScripts()[0].textContent).not.toContain('</script>');
    expect(JSON.parse(jsonLdScripts()[0].textContent!)).toEqual({
      '@context': 'https://schema.org',
      '@graph': itemMeta.jsonLd,
    });

    await router.navigateByUrl('/items');
    expect(jsonLdScripts()).toHaveLength(1);
    expect(JSON.parse(jsonLdScripts()[0].textContent!)['@graph']).toEqual(listMeta.jsonLd);
  });

  it('removes the JSON-LD on a page without any', async () => {
    await router.navigateByUrl('/items/4151');
    await router.navigateByUrl('/about');
    expect(jsonLdScripts()).toHaveLength(0);

    await router.navigateByUrl('/items/4151');
    await router.navigateByUrl('/nope');
    expect(jsonLdScripts()).toHaveLength(0);
  });
});
