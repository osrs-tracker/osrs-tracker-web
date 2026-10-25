import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { PlayerCount } from '@osrs-tracker/models';
import { defer, filter, fromEvent, interval, map, merge, share } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { WINDOW } from '@app/core/platform/window-token';

const MINUTE = 60_000;

/**
 * Shared by the Players online page and the Game menu's card so they show the same number: the live count from Jagex's
 * world list when it loads, else the newest stored sample. The server renders the live count too, so the number doesn't
 * change on hydration: the transfer cache hands the browser the server's count.
 * The API keeps the live count for a minute, so renders poll Jagex at most once a minute, and the SSR timeout keeps a
 * slow poll from holding up a render (it then shows the stored sample, and the browser fetches the live one).
 */
export const PlayerCountStore = signalStore(
  { providedIn: 'root' },
  withState({ _storedRequested: false, _liveRequested: false }),
  withProps(({ _storedRequested, _liveRequested }) => {
    const osrsTrackerRepo = inject(OsrsTrackerRepo);
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    return {
      _isBrowser: isBrowser,
      _stored: rxResource({
        params: () => _storedRequested() || undefined,
        stream: () => osrsTrackerRepo.getLatestPlayerCount(),
      }),
      _live: rxResource({
        params: () => _liveRequested() || undefined,
        // The first load uses the transfer cache; the refreshes after it revalidate
        stream: ({ previous }) => osrsTrackerRepo.getLivePlayerCount(previous.status !== 'idle'),
      }),
    };
  }),
  withComputed(({ _stored, _live, _isBrowser }) => {
    const count = computed<PlayerCount | undefined>(() =>
      _live.hasValue() ? _live.value() : _stored.hasValue() ? _stored.value() : undefined,
    );

    return {
      count,
      /** Neither count loaded. Never during SSR: a failed count renders as loading, as the browser loads both again */
      failed: computed<boolean>(() => _isBrowser && !count() && !!_live.error()),
    };
  }),
  withMethods(store => ({
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
      /** Browser only */
      _refreshes: defer(() => {
        const document = window!.document;
        let missed = false;
        const minutes = interval(MINUTE).pipe(map(() => true));
        const shown = fromEvent(document, 'visibilitychange').pipe(map(() => false));
        return merge(minutes, shown).pipe(
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
    /** Loads both counts also during SSR; on hydration they come from the transfer cache. */
    watch(onRefresh?: () => void): void {
      const destroyRef = inject(DestroyRef);
      // Not while they load: a second watcher in the same render would fetch them twice
      if (store._liveRequested() && !store._live.isLoading()) store.refresh();
      else patchState(store, { _storedRequested: true, _liveRequested: true });
      afterNextRender(() => store._refreshes.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => onRefresh?.()));
    },
  })),
);
