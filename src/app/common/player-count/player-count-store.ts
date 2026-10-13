import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { PlayerCount } from '@osrs-tracker/models';
import { defer, filter, fromEvent, interval, map, merge, of, share } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { WINDOW } from '@app/core/platform/window-token';

const MINUTE = 60_000;

/**
 * The players online count that the Players online page and the Game menu's card share, so they always show the same
 * number: the live count from Jagex's world list when it loads, else the newest stored sample. The server renders only
 * the stored sample, so a render never waits on Jagex.
 */
export const PlayerCountStore = signalStore(
  { providedIn: 'root' },
  withState({ _storedRequested: false, _liveRequested: false }),
  withProps(({ _storedRequested, _liveRequested }) => {
    const osrsTrackerRepo = inject(OsrsTrackerRepo);
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    return {
      _stored: rxResource({
        params: () => _storedRequested() || undefined,
        stream: () => osrsTrackerRepo.getLatestPlayerCount(),
      }),
      _live: rxResource({
        params: () => (isBrowser && _liveRequested()) || undefined,
        stream: () => osrsTrackerRepo.getLivePlayerCount(),
      }),
    };
  }),
  withComputed(({ _stored, _live }) => {
    const count = computed<PlayerCount | undefined>(() =>
      _live.hasValue() ? _live.value() : _stored.hasValue() ? _stored.value() : undefined,
    );

    return {
      count,
      /** Neither count loaded. Never during SSR: a failed stored sample renders as loading, as the browser loads both */
      failed: computed<boolean>(() => !count() && !!_live.error()),
    };
  }),
  withMethods(store => ({
    /** Fetches the live count and the stored sample again (or for the first time) */
    refresh(): void {
      if (store._storedRequested()) store._stored.reload();
      else patchState(store, { _storedRequested: true });
      if (store._liveRequested()) store._live.reload();
      else patchState(store, { _liveRequested: true });
    },
  })),
  withProps(store => {
    const window = inject(WINDOW);

    return {
      /**
       * Refreshes right away when the first `watch`er renders, then every minute while the tab is visible, and on
       * coming back to the tab after a missed minute; stops when the last `watch`er is destroyed. Browser only.
       */
      _refreshes: defer(() => {
        const document = window!.document;
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
        map(() => store.refresh()),
        share(),
      ),
    };
  }),
  withMethods(store => ({
    /**
     * For a component that shows the count while it's on screen: loads the stored sample (also during SSR), then
     * refreshes as `_refreshes` describes until the component is destroyed. `onRefresh` runs with each refresh.
     */
    watch(onRefresh?: () => void): void {
      const destroyRef = inject(DestroyRef);
      patchState(store, { _storedRequested: true });
      afterNextRender(() => store._refreshes.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => onRefresh?.()));
    },
  })),
);
