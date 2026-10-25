import { DOCUMENT, ErrorHandler, inject, Injector, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { config } from '@config/config';

export interface PageMeta {
  /** Over the route's `title`, which then only titles the page when there's no meta (a not-found state) */
  title?: string;
  description: string;
  /** Path only, no query: '/trackers/price/4151' */
  canonicalPath: string;
  image?: PageImage;
  card?: 'summary' | 'summary_large_image';
  /** schema.org nodes for the page's JSON-LD, with absolute URLs; rendered as one `@graph` */
  jsonLd?: JsonLdNode[];
}

/**
 * A route's `data['meta']`: fixed, or built from the route once its resolvers ran (its resolved `data` and `params`),
 * `undefined` when the page has none (a not-found state). A function, not a resolver: the page's own resolver already
 * fetched what it describes.
 */
export type RouteMeta = PageMeta | ((route: ActivatedRouteSnapshot) => PageMeta | undefined);

export type JsonLdNode = { '@type': string } & Record<string, unknown>;

export interface PageImage {
  /** Path on this site or an absolute URL */
  url: string;
  width: number;
  height: number;
  alt: string;
}

export const DEFAULT_DESCRIPTION =
  'Track everything that matters in Old School RuneScape with OSRS Tracker. Track the latest news, item prices, hiscores, and XP gains all in one place.';

const DEFAULT_IMAGE: PageImage = {
  url: '/assets/og/osrs-tracker.png?v=3',
  width: 1200,
  height: 630,
  alt: 'OSRS Tracker: XP tracker and Grand Exchange prices for Old School RuneScape',
};

/**
 * The app icon, square, for `summary` cards on the pages of players the API doesn't store, who have no preview card: a
 * thumbnail stays readable, where the wide default image shrinks to a sliver.
 */
export const ICON_IMAGE: PageImage = {
  url: '/assets/pwa/icon-512x512.png',
  width: 512,
  height: 512,
  alt: 'OSRS Tracker',
};

export const SITE_NAME = 'OSRS Tracker';

const JSON_LD_ID = 'page-jsonld';

/** Every tag this strategy sets apart from the description, so a page without meta can remove them all. */
const SOCIAL_TAGS = [
  'property="og:title"',
  'property="og:description"',
  'property="og:url"',
  'property="og:type"',
  'property="og:site_name"',
  'property="og:image"',
  'property="og:image:width"',
  'property="og:image:height"',
  'property="og:image:alt"',
  'name="twitter:card"',
];

/**
 * Sets the title, description, canonical link and social tags once per navigation, from the deepest route's
 * `data['meta']` (a `RouteMeta`). Angular calls `updateTitle` after every successful navigation, also during SSR.
 */
@Service()
export class PageMetaStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  // `ErrorHandler` only when needed: the app's one reports to `AnalyticsService`, which injects this strategy
  private readonly injector = inject(Injector);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  /** The meta's title, else the route's: also what `AnalyticsService` reports */
  override buildTitle(snapshot: RouterStateSnapshot): string | undefined {
    return this.pageMetaOf(snapshot)?.title ?? super.buildTitle(snapshot);
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageMeta = this.pageMetaOf(snapshot);
    const title = pageMeta?.title ?? super.buildTitle(snapshot) ?? SITE_NAME;
    this.title.setTitle(title);

    this.meta.updateTag({ name: 'description', content: pageMeta?.description ?? DEFAULT_DESCRIPTION });

    this.setJsonLd(pageMeta?.jsonLd);

    if (!pageMeta) {
      SOCIAL_TAGS.forEach(selector => this.meta.removeTag(selector));
      this.canonicalLink()?.remove();
      return;
    }

    const url = canonicalUrl(pageMeta.canonicalPath);
    const image = pageMeta.image ?? DEFAULT_IMAGE;
    const tags: Record<string, string> = {
      'og:title': title,
      'og:description': pageMeta.description,
      'og:url': url,
      'og:type': 'website',
      'og:site_name': SITE_NAME,
      'og:image': absoluteUrl(image.url),
      'og:image:width': String(image.width),
      'og:image:height': String(image.height),
      'og:image:alt': image.alt,
    };
    Object.entries(tags).forEach(([property, content]) => this.meta.updateTag({ property, content }));
    this.meta.updateTag({ name: 'twitter:card', content: pageMeta.card ?? 'summary_large_image' });

    this.setCanonical(url);
  }

  /**
   * A meta function that throws (a bug, or data the API never sends) is reported and the page gets no meta, rather than
   * failing the navigation: Angular calls `updateTitle` at its end without catching, and during SSR the page wouldn't
   * render. The page is then titled by its route, which for an item or player page is its not-found title.
   */
  private pageMetaOf(snapshot: RouterStateSnapshot): PageMeta | undefined {
    const route = deepestChild(snapshot.root);
    const meta = route.data['meta'] as RouteMeta | undefined;
    if (typeof meta !== 'function') return meta;
    try {
      return meta(route);
    } catch (error) {
      this.injector.get(ErrorHandler).handleError(error);
      return undefined;
    }
  }

  private setCanonical(url: string): void {
    let link = this.canonicalLink();
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * A data block, which browsers never run: the CSP's `script-src` doesn't apply, so it needs no nonce. Angular strips
   * `<script>` from templates, hence the DOM.
   */
  private setJsonLd(nodes: JsonLdNode[] | undefined): void {
    let script = this.document.getElementById(JSON_LD_ID);
    if (!nodes?.length) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.id = JSON_LD_ID;
      this.document.head.appendChild(script);
    }
    const graph = { '@context': 'https://schema.org', '@graph': nodes };
    // `<` escaped, so an item name can't close the script element
    script.textContent = JSON.stringify(graph).replace(/</g, '\\u003c');
  }

  private canonicalLink(): HTMLLinkElement | null {
    return this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  }
}

function deepestChild(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? deepestChild(route.firstChild) : route;
}

/** A canonical URL never carries a query or fragment. */
function canonicalUrl(path: string): string {
  return absoluteUrl(path.replace(/[?#].*$/, ''));
}

export function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : config.siteUrl + pathOrUrl;
}
