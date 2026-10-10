import { absoluteUrl, JsonLdNode, SITE_NAME } from './page-meta-strategy';

/** One step of a breadcrumb trail: what the page is called, and its canonical path */
export interface Crumb {
  name: string;
  path: string;
}

/** Home, then `crumbs`; the last one is the page itself. */
export function breadcrumbList(crumbs: Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    'itemListElement': [{ name: 'Home', path: '/' }, ...crumbs].map(({ name, path }, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      name,
      'item': absoluteUrl(path),
    })),
  };
}

/** A page about one subject, such as an item or a player, given as a plain `Thing`: no more specific type fits. */
export function webPage(page: { path: string; title: string; description: string; about: JsonLdNode }): JsonLdNode {
  return {
    '@type': 'WebPage',
    'url': absoluteUrl(page.path),
    'name': page.title,
    'description': page.description,
    'about': page.about,
  };
}

/** For Home only: the site name search results show. */
export function webSite(): JsonLdNode {
  return { '@type': 'WebSite', 'name': SITE_NAME, 'url': absoluteUrl('/') };
}
