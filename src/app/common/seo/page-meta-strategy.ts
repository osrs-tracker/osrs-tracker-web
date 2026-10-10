import { DOCUMENT, inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { config } from '@config/config';

export interface PageMeta {
  description: string;
  /** Path only, no query: '/trackers/price/4151' */
  canonicalPath: string;
  image?: PageImage;
  card?: 'summary' | 'summary_large_image';
}

export interface PageImage {
  /** Path on this site or an absolute URL */
  url: string;
  width: number;
  height: number;
  alt: string;
}

export const DEFAULT_DESCRIPTION =
  'Track everything that matters in Old School RuneScape with OSRS Tracker. Track the latest news, item prices, hiscores, and XP gains all in one place.';

export const DEFAULT_IMAGE: PageImage = {
  url: '/assets/og/osrs-tracker.png?v=2',
  width: 1200,
  height: 630,
  alt: 'OSRS Tracker: XP tracker and Grand Exchange prices for Old School RuneScape',
};

/**
 * The app icon, square, for `summary` cards on item and player pages: a thumbnail stays readable, where the wide default
 * image shrinks to a sliver.
 */
export const ICON_IMAGE: PageImage = {
  url: '/assets/pwa/icon-512x512.png',
  width: 512,
  height: 512,
  alt: 'OSRS Tracker',
};

const SITE_NAME = 'OSRS Tracker';

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
 * `data['meta']` (static or resolved). Angular calls `updateTitle` after every successful navigation, also during SSR.
 */
@Service()
export class PageMetaStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot) ?? SITE_NAME;
    this.title.setTitle(title);

    const pageMeta = deepestChild(snapshot.root).data['meta'] as PageMeta | undefined;
    this.meta.updateTag({ name: 'description', content: pageMeta?.description ?? DEFAULT_DESCRIPTION });

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

  private setCanonical(url: string): void {
    let link = this.canonicalLink();
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
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

function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : config.siteUrl + pathOrUrl;
}
