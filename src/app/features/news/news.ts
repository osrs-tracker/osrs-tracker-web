import { DatePipe, formatDate, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { StoredNewsItem } from '@osrs-tracker/models';
import { subDays } from 'date-fns';
import { announceChanges } from '@app/common/a11y/announcer';
import { newsImageUrl, OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { paging } from '@app/common/paging/paging';
import { LastPlayedStore, parseDay } from '@app/common/storage/last-played-store';
import { DayPicker } from '@app/common/ui/controls/day-picker';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { LucideExternalLink, LucideNewspaper, LucideX } from '@lucide/angular';

/** Posts per page: the first one is rendered on the server, "Show older posts" loads the next */
const PAGE_SIZE = 30;
/** The first rows' artwork is in view on load, so it isn't lazy */
const EAGER_IMAGES = 3;

/** The categories to filter on, by Jagex's name; the rare ones (Website, Support…) are only under All */
export const NEWS_CATEGORIES: SegmentedOption<string>[] = [
  { value: '', label: 'All' },
  { value: 'Game Updates', label: 'Game Updates' },
  { value: 'Future Updates', label: 'Future Updates' },
  { value: 'Developer Blogs', label: 'Developer Blogs' },
  { value: 'Community', label: 'Community' },
  { value: 'Event', label: 'Events' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Behind the Scenes', label: 'Behind the Scenes' },
];

interface NewsMonth {
  key: string;
  label: string;
  posts: (StoredNewsItem & { image?: string; eager: boolean })[];
}

/**
 * The news archive: every stored post, newest first, by month, a page at a time, each linking to the post on Jagex's
 * site. The category and the "since you last played" day are in the link (`?category=`, `?since=`), so the server
 * renders them and they can be shared. Picking either replaces the link without a navigation, which would scroll to
 * the top. Posts are dated by UTC day, so dates and months are shown in UTC.
 */
@Component({
  selector: 'news',
  templateUrl: './news.html',
  imports: [DatePipe, DayPicker, LoadError, Segmented, Skeleton, LucideNewspaper, LucideX, LucideExternalLink],
})
export default class News {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly lastPlayedStore = inject(LastPlayedStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly dayPicker = viewChild.required(DayPicker);

  readonly categories = NEWS_CATEGORIES;
  /** Any day from before the first Old School post up to yesterday: "since today" would always be empty */
  readonly pickerRange: { from: string; to: string } = {
    from: '2013-01-01',
    to: subDays(new Date(), 1).toISOString().slice(0, 10),
  };

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  /** The category's name as Jagex uses it, `''` for all; a link to another one shows all */
  readonly category = linkedSignal(() => {
    const category = this.queryParams().get('category') ?? '';
    return NEWS_CATEGORIES.some(option => option.value === category) ? category : '';
  });

  /** The "since you last played" day, `YYYY-MM-DD`, or `null` for every post */
  readonly since = linkedSignal(() => parseDay(this.queryParams().get('since')));
  readonly sinceDate = computed(() => {
    const since = this.since();
    return since ? new Date(`${since}T00:00:00Z`) : null;
  });
  /** The end of the picked day: the posts "after the day" start here (feed posts carry a time, not only a day) */
  private readonly sinceEnd = computed(() => {
    const sinceDate = this.sinceDate();
    return sinceDate ? new Date(sinceDate.getTime() + 24 * 60 * 60 * 1000) : null;
  });

  /** With no day in the link, the calendar opens on the one remembered on this device, else a week ago */
  readonly openAt = computed(
    () => this.lastPlayedStore.lastPlayed() ?? subDays(new Date(), 7).toISOString().slice(0, 10),
  );

  readonly firstPage = rxResource({
    params: () => ({ category: this.category() }),
    stream: ({ params }) => this.osrsTrackerRepo.getNewsArchive(PAGE_SIZE, { category: params.category || undefined }),
  });

  /** During SSR a failed load renders as loading, as the browser fetches it again after hydration */
  readonly firstPageFailed = computed(() => this.isBrowser && !!this.firstPage.error());

  /** The pages after the first, which start over with the category */
  private readonly older = paging({
    reset: this.category,
    fetch: ({ before, category }: { before: string; category: string }) =>
      this.osrsTrackerRepo.getNewsArchive(PAGE_SIZE, { before, category: category || undefined }),
  });
  readonly loadingOlder = this.older.loading;
  readonly olderFailed = computed(() => !!this.older.failed());
  private readonly olderPosts = computed(() => this.older.pages().flatMap(page => page.posts));

  private readonly posts = computed(() =>
    this.firstPage.hasValue() && this.firstPage.value() ? [...this.firstPage.value()!.posts, ...this.olderPosts()] : [],
  );
  private readonly next = computed(() => {
    const lastPage = this.older.pages().at(-1) ?? (this.firstPage.hasValue() ? this.firstPage.value() : undefined);
    return lastPage?.next ?? null;
  });

  /** With a day picked: whether the loaded posts reach back to it, so every post since is shown */
  readonly reachedSince = computed(() => {
    const sinceEnd = this.sinceEnd();
    const oldest = this.posts().at(-1);
    return !!sinceEnd && !!oldest && oldest.pubDate < sinceEnd;
  });

  readonly hasOlder = computed(() => !this.reachedSince() && this.next() !== null);

  /** The day picked is before the oldest stored post: the end note says where the history starts */
  readonly historyStart = computed(() =>
    this.since() && !this.category() && !this.hasOlder() && !this.reachedSince()
      ? (this.posts().at(-1)?.pubDate ?? null)
      : null,
  );

  readonly months = computed(() => {
    const sinceEnd = this.sinceEnd();
    const months: NewsMonth[] = [];
    let images = 0;

    for (const post of this.posts()) {
      if (sinceEnd && post.pubDate < sinceEnd) break;

      const key = `${post.pubDate.getUTCFullYear()}-${post.pubDate.getUTCMonth()}`;
      const image = post.enclosure ? newsImageUrl(post.enclosure.url) : undefined;
      if (months.at(-1)?.key !== key) {
        months.push({ key, label: formatDate(post.pubDate, 'MMMM y', 'en-US', 'UTC'), posts: [] });
      }
      months.at(-1)!.posts.push({ ...post, image, eager: !!image && images++ < EAGER_IMAGES });
    }

    return months;
  });

  readonly categoryLabel = computed(
    () => NEWS_CATEGORIES.find(option => option.value === this.category())?.label ?? '',
  );

  /** "Game Updates posts since 1 May 2026", or "posts" without filters */
  private readonly postsLabel = computed(() => {
    const since = this.sinceDate();
    const category = this.category() ? `${this.categoryLabel()} ` : '';
    return `${category}posts${since ? ` since ${formatDate(since, 'd MMMM y', 'en-US', 'UTC')}` : ''}`;
  });
  readonly emptyText = computed(() => `No ${this.postsLabel()}.`);

  /** Read out when a filter or "Show older posts" finishes: how many posts it shows or added, or the failure */
  private readonly announcement = computed(() => {
    if (this.firstPageFailed()) return "The news didn't load.";
    if (this.olderFailed()) return "The older posts didn't load.";
    if (!this.firstPage.hasValue() || !this.firstPage.value() || this.loadingOlder()) return null;

    const olderPage = this.older.pages().at(-1);
    if (olderPage) return `${olderPage.posts.length} older ${olderPage.posts.length === 1 ? 'post' : 'posts'} loaded.`;
    // What's listed: with a day picked, posts older than it are loaded but not shown
    const count = this.months().reduce((total, month) => total + month.posts.length, 0);
    return count ? `Showing ${count} ${this.postsLabel()}.` : this.emptyText();
  });

  readonly skeletonRows: number[] = Array.from({ length: 8 }, (_, i) => i);

  /** Where focus was when "Show older posts" was pressed, to move on to the first post it adds, or to Try again */
  private olderFocus: Element | null = null;

  constructor() {
    announceChanges(this.announcement);
    effect(() => {
      if (this.older.loading()) return;
      const link = this.older.failed() ? undefined : this.older.pages().at(-1)?.posts[0]?.link;
      afterNextRender(() => this.focusAfterOlder(link), { injector: this.injector });
    });
  }

  pickCategory(category: string): void {
    this.category.set(category);
    this.updateQuery();
  }

  pickDay(day: string | null): void {
    const since = parseDay(day);
    this.since.set(since);
    // Clearing the day forgets it too, or the Game menu would keep offering it
    if (since) this.lastPlayedStore.setLastPlayed(since);
    else this.lastPlayedStore.clearLastPlayed();
    this.updateQuery();
  }

  /** The ✕, or the empty message's button, removes itself: focus goes to the day picker */
  clearDay(): void {
    this.pickDay(null);
    this.dayPicker().focus();
  }

  /** The button goes with the empty message: focus goes to the category control shown (a switch, or the dropdown) */
  showEveryCategory(): void {
    this.pickCategory('');
    afterNextRender(
      () => {
        const host = this.elementRef.nativeElement;
        const option = host.querySelector<HTMLElement>('segmented [aria-checked="true"]');
        option?.focus();
        if (this.document.activeElement !== option) host.querySelector('select')?.focus();
      },
      { injector: this.injector },
    );
  }

  showOlder(): void {
    const before = this.next();
    if (!before || this.loadingOlder()) return;

    this.olderFocus = this.document.activeElement;
    this.older.load({ before, category: this.category() });
  }

  /**
   * After a page loads, focuses the first post it added (`link`), or Try again when it failed, if focus is still where
   * "Show older posts" left it: on the button, or on `<body>` once the button is gone.
   */
  private focusAfterOlder(link: string | undefined): void {
    const focus = this.olderFocus;
    this.olderFocus = null;
    const active = this.document.activeElement;
    if (!focus || (active !== focus && active !== this.document.body)) return;

    const host = this.elementRef.nativeElement;
    const target = link
      ? [...host.querySelectorAll<HTMLElement>('a[href]')].find(anchor => anchor.getAttribute('href') === link)
      : host.querySelector<HTMLElement>('load-error button');
    target?.focus();
  }

  /** Puts the filters in the link, replacing the history entry and keeping the scroll position */
  private updateQuery(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: this.category() || null, since: this.since() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      scroll: 'manual',
    });
  }
}
