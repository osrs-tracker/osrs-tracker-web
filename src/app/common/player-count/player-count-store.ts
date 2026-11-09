import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { PlayerCount } from '@osrs-tracker/models';
import { defer, filter, fromEvent, interval, map, merge, Observable, share, tap } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { WINDOW } from '@app/core/platform/window-token';
import { isFrozen } from './frozen-count';

const MINUTE = 60_000;
const FROZEN_AFTER = 5 * MINUTE;
/** An hour of minute-by-minute counts that all differ */
const SEEN_LIMIT = 60;

/**
 * Shared by the Players online page and the Game menu's card so they show the same number: the live count from Jagex's
 * world list when it loads, else the newest stored sample. The server renders the live count too, so the number doesn't
 * change on hydration: the transfer cache hands the browser the server's count.
 * The API keeps the live count for a minute, so renders poll Jagex at most once a minute, and the SSR timeout keeps a
 * slow poll from holding up a render (it then shows the stored sample, and the browser fetches the live one).
 */
export const PlayerCountStore = signalStore(
  { providedIn: 'root' },
  withState({
    _storedRequested: false,
    _liveRequested: false,
    /** The distinct counts read so far, each at its first reading; kept as they arrive, whether `frozen` is read or not */
    _seen: [] as PlayerCount[],
  }),
  withProps(store => {
    const { _storedRequested, _liveRequested } = store;
    const osrsTrackerRepo = inject(OsrsTrackerRepo);
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const remember = (counts: Observable<PlayerCount>) =>
      counts.pipe(
        tap(reading => {
          if (store._seen().some(count => isFrozen(count, reading))) return;
          patchState(store, { _seen: [...store._seen(), reading].slice(-SEEN_LIMIT) });
        }),
      );

    return {
      _isBrowser: isBrowser,
      _stored: rxResource({
        params: () => _storedRequested() || undefined,
        stream: () => remember(osrsTrackerRepo.getLatestPlayerCount()),
      }),
      _live: rxResource({
        params: () => _liveRequested() || undefined,
        // The first load uses the transfer cache; the refreshes after it revalidate
        stream: ({ previous }) => remember(osrsTrackerRepo.getLivePlayerCount(previous.status !== 'idle')),
      }),
    };
  }),
  withComputed(({ _stored, _live, _isBrowser, _seen }) => {
    const count = computed<PlayerCount | undefined>(() =>
      _live.hasValue() ? _live.value() : _stored.hasValue() ? _stored.value() : undefined,
    );

    return {
      count,
      /** Neither count loaded. Never during SSR: a failed count renders as loading, as the browser loads both again */
      failed: computed<boolean>(() => _isBrowser && !count() && !!_live.error()),
      /**
       * The live count repeats a reading taken at least `FROZEN_AFTER` before it on every number: the world list stopped
       * updating, possibly an outage. Not sooner, as two reads a minute apart may get the same list. Compared with every
       * count seen, not only the stored sample: during the 2026-11-09 outage Jagex served two stale lists in turn.
       */
      frozen: computed<boolean>(() => {
        if (!_live.hasValue()) return false;
        const live = _live.value();
        return _seen().some(
          reading => live.date.getTime() - reading.date.getTime() >= FROZEN_AFTER && isFrozen(reading, live),
        );
      }),
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
