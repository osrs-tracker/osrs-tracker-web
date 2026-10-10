import { Component, DOCUMENT, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DESCRIPTION, PageMeta, PageMetaStrategy } from './page-meta-strategy';

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

describe('PageMetaStrategy', () => {
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
          { path: '**', title: 'Not found', component: PageComponent },
        ]),
        { provide: TitleStrategy, useClass: PageMetaStrategy },
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
    expect(canonical()).toBe('https://osrs-tracker.freekmencke.com/items/4151');
    expect(meta.getTag('property="og:title"')?.content).toBe('Whip');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://osrs-tracker.freekmencke.com/items/4151');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
  });

  it('replaces the previous page description and canonical, without duplicating tags', async () => {
    await router.navigateByUrl('/items/4151');
    await router.navigateByUrl('/items');

    expect(description()).toBe('All item prices');
    expect(canonical()).toBe('https://osrs-tracker.freekmencke.com/items');
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
