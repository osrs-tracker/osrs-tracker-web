import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  Component,
  DestroyRef,
  ElementRef,
  InputSignal,
  ResourceRef,
  Signal,
  WritableSignal,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { Subscription, finalize, forkJoin, map, of } from 'rxjs';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { formatNumberLegible } from '@app/common/format/number-format';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';

/** Keys the combobox passes on to the listbox to move the active option */
const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * Item name search with a floating dropdown of matching items and their prices, linking to their price pages.
 * `[leading]` content (e.g. a mode switch) goes before the input. An `initialQuery` is searched for straight away.
 *
 * A combobox on `@angular/aria`: the arrow keys move the active option while focus stays in the input, Enter opens it,
 * Escape, clicking outside or clearing the input closes the dropdown. The options are the result links themselves
 * (`role="option"` on the `<a>`), so mouse users keep middle-click and "Open in new tab".
 */
@Component({
  selector: 'item-search',
  host: { 'class': 'relative block w-full', '(document:pointerdown)': 'closeOnPointerOutside($event)' },
  template: `
    <form autocomplete="off" class="search-box" (submit)="submit($event)">
      <ng-content select="[leading]" />
      <label for="item-search" class="sr-only">Item name</label>
      <input
        #combobox="ngCombobox"
        ngCombobox
        id="item-search"
        type="search"
        class="search-box-input"
        placeholder="Item name, e.g. Abyssal whip"
        name="query"
        autocomplete="hidden"
        [(value)]="query"
        [(expanded)]="expanded"
        (keydown)="onKeydown($event)"
        (input)="navigated.set(false)"
        (click)="expanded.set(true)"
      />

      <button type="submit" class="button--primary search-box-button">
        <svg
          class="size-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="max-sm:sr-only">Search</span>
      </button>
    </form>

    <!-- Rendered by the combobox while it's expanded (browser only). Pressing inside keeps focus where it is, so the
         input's focusout doesn't close it before a click lands. -->
    <ng-template ngComboboxPopup [combobox]="combobox">
      @if (open()) {
        <div
          class="absolute inset-x-0 top-full z-10 mt-2 rounded-2xl bg-card border border-border shadow-float overflow-hidden"
          (mousedown)="$event.preventDefault()"
        >
          @if (loading()) {
            <div class="py-1.5" aria-busy="true">
              <span class="sr-only">Searching…</span>
              @for (width of skeletonWidths; track $index) {
                <div class="flex items-center gap-3 min-h-11 px-4 py-1.5" aria-hidden="true">
                  <skeleton class="size-8 rounded-lg" />
                  <span class="flex-1 min-w-0"><skeleton class="h-4" [class]="width" /></span>
                  <skeleton class="h-3 w-14" />
                </div>
              }
            </div>
          } @else if (error()) {
            <load-error source="item-search" message="Couldn't search items." (retry)="searchItems()" />
          } @else if (results().length) {
            <div
              #listbox="ngListbox"
              ngListbox
              ngComboboxWidget
              aria-label="Items"
              class="py-1.5 max-h-70 overflow-y-auto scroll-bar"
              focusMode="activedescendant"
              tabindex="-1"
              [activeDescendant]="listbox.activeDescendant()"
              [(value)]="selected"
            >
              @for (item of results(); track item.id) {
                <a
                  ngOption
                  class="flex items-center gap-3 min-h-11 px-4 py-1.5 font-bold text-strong hover:bg-row aria-selected:bg-row"
                  [value]="item.id"
                  [label]="item.name"
                  [routerLink]="['/trackers/price', item.id]"
                  (click)="onOptionClick($event)"
                >
                  <span class="flex items-center justify-center size-8 shrink-0" aria-hidden="true">
                    <img class="max-w-7 max-h-7" icon [name]="item.icon" [wiki]="true" />
                  </span>
                  <span class="flex-1 min-w-0">{{ item.name }}</span>
                  @if (pricesResource.isLoading()) {
                    <skeleton class="h-3 w-14" />
                  } @else if (pricesResource.error()) {
                    <load-error
                      compact
                      source="item-search-prices"
                      message="Couldn't load the price."
                      (retry)="pricesResource.reload()"
                    />
                  } @else if (prices()[item.id]; as price) {
                    <span class="text-sm font-normal text-muted tabular-nums">{{ shortPrice(price) }} gp</span>
                  }
                </a>
              }
            </div>
          } @else {
            <p class="p-4 text-muted">No items match “{{ searchedQuery() }}”.</p>
          }
        </div>
      }
    </ng-template>
  `,
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, RouterLink, Icon, LoadError, Skeleton],
})
export class ItemSearch {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);
  private readonly router = inject(Router);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** E.g. the name searched for on an item page that wasn't found */
  readonly initialQuery: InputSignal<string> = input('');

  readonly query: WritableSignal<string> = signal('');
  readonly loading: WritableSignal<boolean> = signal(false);
  readonly results: WritableSignal<Item[]> = signal([]);
  readonly error: WritableSignal<boolean> = signal(false);
  /** The query of the last finished search, for the "No items match" message. */
  readonly searchedQuery: WritableSignal<string | null> = signal(null);

  /** The combobox's state: a search opens it; Escape, focus or a press leaving the search, or clearing it close it. */
  readonly expanded: WritableSignal<boolean> = signal(false);
  /** Whether there's something to show: while searching and once a search has finished or failed, until cleared. */
  readonly open: Signal<boolean> = computed(
    () => !!this.query().trim() && (this.loading() || this.error() || this.searchedQuery() !== null),
  );
  /** The active option's item ID (the listbox selects the option the arrow keys reach, the first one at the start) */
  readonly selected: WritableSignal<number[]> = signal([]);
  /** Whether the arrow keys moved the active option since the input last changed, so Enter opens it. */
  readonly navigated: WritableSignal<boolean> = signal(false);

  /** Name bar widths of the rows shown while searching, varied like `list-row-skeleton`'s */
  readonly skeletonWidths: string[] = ['w-32', 'w-24', 'w-36'];

  /** The latest instant-sell price per result; the requests share one fetch of all latest prices. */
  readonly pricesResource: ResourceRef<Record<number, number | undefined>> = rxResource({
    params: () => ({ ids: this.results().map(item => item.id) }),
    stream: ({ params: { ids } }) =>
      ids.length
        ? forkJoin(ids.map(id => this.osrsPricesRepo.getLatestPrices(id).pipe(map(prices => [id, prices.low])))).pipe(
            map(entries => Object.fromEntries(entries)),
          )
        : of({}),
    defaultValue: {},
  });
  readonly prices: Signal<Record<number, number | undefined>> = computed(() =>
    this.pricesResource.hasValue() ? this.pricesResource.value() : {},
  );

  private readonly listbox: Signal<Listbox<number> | undefined> = viewChild(Listbox);
  private searchSubscription?: Subscription;

  constructor() {
    // Browser only: the page is cached without its query string, so the server never sees it
    afterNextRender(() => {
      if (!this.initialQuery()) return;
      this.query.set(this.initialQuery());
      this.searchItems();
    });

    // Typing or ArrowDown expand the combobox; with nothing to show, aria-expanded must stay false
    effect(() => {
      if (this.expanded() && !this.open()) this.expanded.set(false);
    });

    // Keep the option the arrow keys reach in view in the scrolling list (not when results arrive, which could scroll
    // the page on phones)
    afterRenderEffect(() => {
      this.selected();
      if (untracked(this.navigated)) this.listbox()?.scrollActiveItemIntoView();
    });
  }

  shortPrice(price: number): string {
    return formatNumberLegible(price);
  }

  /** The Search button, or Enter with a modifier (the input handles a plain Enter) */
  submit(event: Event): void {
    event.preventDefault();
    this.searchItems();
  }

  /**
   * The combobox passes the arrow keys and Enter on to the listbox while it's expanded. A plain Enter opens the active
   * option when the arrow keys reached it or the results are for what's in the input, and searches otherwise.
   */
  onKeydown(event: KeyboardEvent): void {
    if (NAVIGATION_KEYS.has(event.key)) this.navigated.set(true);
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

    event.preventDefault();
    const [id] = this.selected();
    const showingResults =
      this.expanded() && this.open() && !this.loading() && !this.error() && !!this.results().length;
    if (showingResults && id !== undefined && (this.navigated() || this.query() === this.searchedQuery())) {
      this.expanded.set(false);
      this.router.navigate(['/trackers/price', id]);
    } else {
      this.searchItems();
    }
  }

  /**
   * Opening a result in this tab closes the combobox first: otherwise its focusout timer closes it after the page
   * changed, and Angular warns about an output of a destroyed directive (NG0953). A click with a modifier opens a new
   * tab or window, so the dropdown stays.
   */
  onOptionClick(event: MouseEvent): void {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) this.expanded.set(false);
  }

  /** A press outside closes the combobox, also when focus was never in the input (the Search button, `?q=`). */
  closeOnPointerOutside(event: PointerEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node | null)) this.expanded.set(false);
  }

  searchItems(): void {
    this.error.set(false);
    if (!this.query()) return;

    // Cancel the previous search (before setting loading, as this runs its finalize), so a slow earlier response can't
    // overwrite a newer one
    this.searchSubscription?.unsubscribe();
    this.loading.set(true);
    this.navigated.set(false);
    this.expanded.set(true);

    const query = this.query();
    this.searchSubscription = this.osrsTrackerRepo
      .searchItems(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: items => {
          this.results.set(items ?? []);
          this.searchedQuery.set(query);
        },
        error: () => {
          this.results.set([]);
          this.error.set(true);
        },
      });
  }
}
