import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  ResourceRef,
  Service,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlayerCount } from '@osrs-tracker/models';
import { defer, filter, fromEvent, map, merge, Observable, of, share, interval } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { WINDOW } from '@app/core/platform/window-token';

const MINUTE = 60_000;

/**
 * The players online count that the Players online page and the Game menu's card share, so they always show the same
 * number: the live count from Jagex's world list when it loads, else the newest stored sample. The server renders only
 * the stored sample, so a render never waits on Jagex.
 */
@Service()
export class PlayerCountStore {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly window = inject(WINDOW);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly storedRequested: WritableSignal<boolean> = signal(false);
  private readonly liveRequested: WritableSignal<boolean> = signal(false);

  private readonly stored: ResourceRef<PlayerCount | undefined> = rxResource({
    params: () => this.storedRequested() || undefined,
    stream: () => this.osrsTrackerRepo.getLatestPlayerCount(),
  });

  private readonly live: ResourceRef<PlayerCount | undefined> = rxResource({
    params: () => (this.isBrowser && this.liveRequested()) || undefined,
    stream: () => this.osrsTrackerRepo.getLivePlayerCount(),
  });

  readonly count: Signal<PlayerCount | undefined> = computed(() =>
    this.live.hasValue() ? this.live.value() : this.stored.hasValue() ? this.stored.value() : undefined,
  );

  /** Neither count loaded. Never during SSR: a failed stored sample renders as loading, as the browser loads both */
  readonly failed: Signal<boolean> = computed(() => !this.count() && !!this.live.error());

  /**
   * Refreshes right away when the first `watch`er renders, then every minute while the tab is visible, and on coming
   * back to the tab after a missed minute; stops when the last `watch`er is destroyed. Browser only.
   */
  private readonly refreshes: Observable<void> = defer(() => {
    const document = this.window!.document;
    let missed = false;
    const minutes = interval(MINUTE).pipe(map(() => true));
    const shown = fromEvent(document, 'visibilitychange').pipe(map(() => false));
    return merge(of(true), minutes, shown).pipe(
      filter(minute => {
        if (document.hidden) {
          missed ||= minute;
          return false;
        }
        const due = minute || missed;
        missed = false;
        return due;
      }),
    );
  }).pipe(
    map(() => this.refresh()),
    share(),
  );

  /** Fetches the live count and the stored sample again (or for the first time) */
  refresh(): void {
    untracked(() => {
      if (this.storedRequested()) this.stored.reload();
      else this.storedRequested.set(true);
      if (this.liveRequested()) this.live.reload();
      else this.liveRequested.set(true);
    });
  }

  /**
   * For a component that shows the count while it's on screen: loads the stored sample (also during SSR), then
   * refreshes as `refreshes` describes until the component is destroyed. `onRefresh` runs with each refresh.
   */
  watch(onRefresh?: () => void): void {
    const destroyRef = inject(DestroyRef);
    this.storedRequested.set(true);
    afterNextRender(() => this.refreshes.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => onRefresh?.()));
  }
}
