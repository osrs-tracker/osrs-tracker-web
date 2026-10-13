import { computed, linkedSignal, Signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Observable, Subject, switchMap, tap } from 'rxjs';

/** The pages loaded after a list's first page, one request at a time */
export interface Paging<Request, Page> {
  /** In the order they loaded */
  readonly pages: Signal<Page[]>;
  readonly loading: Signal<boolean>;
  /** The request that failed; cleared by the next load */
  readonly failed: Signal<Request | undefined>;
  /** Loads a page, cancelling one still loading */
  load(request: Request): void;
}

interface PagingState<Request, Page> {
  /** New when the list starts over, so a page loading for an earlier list can tell it doesn't belong */
  list: object;
  pages: Page[];
  loading: boolean;
  failed?: Request;
}

/**
 * Pages after a list's first page, such as "Show older posts". Another `reset()` value (a category, an offset) starts
 * the list over: it drops the pages, and a page still loading for the old list is ignored when it arrives. Call it in
 * an injection context. Hand-written, as a resource holds one value per request, not pages that add up.
 */
export function paging<Request, Page>(options: {
  reset: () => unknown;
  fetch: (request: Request) => Observable<Page>;
}): Paging<Request, Page> {
  const state = linkedSignal({
    source: options.reset,
    computation: (): PagingState<Request, Page> => ({ list: {}, pages: [], loading: false }),
  });
  const loads = new Subject<Request>();

  loads
    .pipe(
      // runs after switchMap cancelled the load before, so that one's finalize can't clear this one's loading
      switchMap(request => {
        const { list } = untracked(state);
        const update = (change: (current: PagingState<Request, Page>) => Partial<PagingState<Request, Page>>): void => {
          if (untracked(state).list === list) state.update(current => ({ ...current, ...change(current) }));
        };

        update(() => ({ loading: true, failed: undefined }));
        return options.fetch(request).pipe(
          tap(page => update(current => ({ pages: [...current.pages, page] }))),
          catchError(() => (update(() => ({ failed: request })), EMPTY)),
          finalize(() => update(() => ({ loading: false }))),
        );
      }),
      takeUntilDestroyed(),
    )
    .subscribe();

  return {
    pages: computed(() => state().pages),
    loading: computed(() => state().loading),
    failed: computed(() => state().failed),
    load: request => loads.next(request),
  };
}
