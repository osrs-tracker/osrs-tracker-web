import { DatePipe, formatDate, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  inject,
  linkedSignal,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  WritableSignal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsArchivePage, newsImageUrl, NewsPost, OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { paging } from '@app/common/paging/paging';
import { LastPlayedStore, parseDay } from '@app/common/storage/last-played-store';
import { DayPicker } from '@app/common/ui/controls/day-picker';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Glyph } from '@app/common/ui/glyph/glyph';

/** Posts per page: the first one is rendered on the server, "Show older posts" loads the next */
const PAGE_SIZE = 30;

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
  posts: (NewsPost & { image?: string })[];
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
  imports: [DatePipe, DayPicker, LoadError, Segmented, Skeleton, Glyph],
})
export default class News {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly lastPlayedStore = inject(LastPlayedStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly categories = NEWS_CATEGORIES;
  /** Any day from before the first Old School post up to today */
  readonly pickerRange: { from: string; to: string } = {
    from: '2013-01-01',
    to: new Date().toISOString().slice(0, 10),
  };

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  /** The category's name as Jagex uses it, `''` for all; a link to another one shows all */
  readonly category: WritableSignal<string> = linkedSignal(() => {
    const category = this.queryParams().get('category') ?? '';
    return NEWS_CATEGORIES.some(option => option.value === category) ? category : '';
  });

  /** The "since you last played" day, `YYYY-MM-DD`, or `null` for every post */
  readonly since: WritableSignal<string | null> = linkedSignal(() => parseDay(this.queryParams().get('since')));
  readonly sinceDate: Signal<Date | null> = computed(() => {
    const since = this.since();
    return since ? new Date(`${since}T00:00:00Z`) : null;
  });
  /** The end of the picked day: the posts "after the day" start here (feed posts carry a time, not only a day) */
  private readonly sinceEnd: Signal<Date | null> = computed(() => {
    const sinceDate = this.sinceDate();
    return sinceDate ? new Date(sinceDate.getTime() + 24 * 60 * 60 * 1000) : null;
  });

  /** With no day in the link, the calendar opens on the one remembered on this device */
  readonly lastPlayed: Signal<string | null> = this.lastPlayedStore.lastPlayed;

  readonly firstPage: ResourceRef<NewsArchivePage | undefined> = rxResource({
    params: () => ({ category: this.category() }),
    stream: ({ params }) => this.osrsTrackerRepo.getNewsArchive(PAGE_SIZE, { category: params.category || undefined }),
  });

  /** During SSR a failed load renders as loading, as the browser fetches it again after hydration */
  readonly firstPageFailed: Signal<boolean> = computed(() => this.isBrowser && !!this.firstPage.error());

  /** The pages after the first, which start over with the category */
  private readonly older = paging({
    reset: this.category,
    fetch: ({ before, category }: { before: string; category: string }) =>
      this.osrsTrackerRepo.getNewsArchive(PAGE_SIZE, { before, category: category || undefined }),
  });
  readonly loadingOlder: Signal<boolean> = this.older.loading;
  readonly olderFailed: Signal<boolean> = computed(() => !!this.older.failed());
  private readonly olderPosts: Signal<NewsPost[]> = computed(() => this.older.pages().flatMap(page => page.posts));

  private readonly posts: Signal<NewsPost[]> = computed(() =>
    this.firstPage.hasValue() && this.firstPage.value() ? [...this.firstPage.value()!.posts, ...this.olderPosts()] : [],
  );
  private readonly next: Signal<string | null> = computed(() => {
    const lastPage = this.older.pages().at(-1) ?? (this.firstPage.hasValue() ? this.firstPage.value() : undefined);
    return lastPage?.next ?? null;
  });

  /** With a day picked: whether the loaded posts reach back to it, so every post since is shown */
  readonly reachedSince: Signal<boolean> = computed(() => {
    const sinceEnd = this.sinceEnd();
    const oldest = this.posts().at(-1);
    return !!sinceEnd && !!oldest && oldest.pubDate < sinceEnd;
  });

  readonly hasOlder: Signal<boolean> = computed(() => !this.reachedSince() && this.next() !== null);

  /** The day picked is before the oldest stored post: the end note says where the history starts */
  readonly historyStart: Signal<Date | null> = computed(() =>
    this.since() && !this.category() && !this.hasOlder() && !this.reachedSince()
      ? (this.posts().at(-1)?.pubDate ?? null)
      : null,
  );

  readonly months: Signal<NewsMonth[]> = computed(() => {
    const sinceEnd = this.sinceEnd();
    const months: NewsMonth[] = [];

    for (const post of this.posts()) {
      if (sinceEnd && post.pubDate < sinceEnd) break;

      const key = `${post.pubDate.getUTCFullYear()}-${post.pubDate.getUTCMonth()}`;
      const image = post.enclosure ? newsImageUrl(post.enclosure.url) : undefined;
      if (months.at(-1)?.key !== key) {
        months.push({ key, label: formatDate(post.pubDate, 'MMMM y', 'en-US', 'UTC'), posts: [] });
      }
      months.at(-1)!.posts.push({ ...post, image });
    }

    return months;
  });

  readonly categoryLabel: Signal<string> = computed(
    () => NEWS_CATEGORIES.find(option => option.value === this.category())?.label ?? '',
  );

  readonly skeletonRows: number[] = Array.from({ length: 8 }, (_, i) => i);

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

  showOlder(): void {
    const before = this.next();
    if (!before || this.loadingOlder()) return;

    this.older.load({ before, category: this.category() });
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
