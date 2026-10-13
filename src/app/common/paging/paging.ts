import { computed, DestroyRef, inject, linkedSignal, Signal, untracked } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

/** The pages loaded after a list's first page, one request at a time */
export interface Paging<Request, Page> {
  /** In the order they loaded */
  readonly pages: Signal<Page[]>;
  readonly loading: Signal<boolean>;
  /** The request that failed, for `retry()`; cleared by the next load */
  readonly failed: Signal<Request | undefined>;
  /** Loads a page, cancelling one still loading */
  load(request: Request): void;
  /** Loads the failed request again */
  retry(): void;
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
  let inFlight: Subscription | undefined;
  inject(DestroyRef).onDestroy(() => inFlight?.unsubscribe());

  function load(request: Request): void {
    inFlight?.unsubscribe();
    const { list } = untracked(state);
    const update = (change: (current: PagingState<Request, Page>) => Partial<PagingState<Request, Page>>): void => {
      if (untracked(state).list === list) state.update(current => ({ ...current, ...change(current) }));
    };

    update(() => ({ loading: true, failed: undefined }));
    inFlight = options.fetch(request).subscribe({
      next: page => update(current => ({ pages: [...current.pages, page], loading: false })),
      error: () => update(() => ({ loading: false, failed: request })),
    });
  }

  return {
    pages: computed(() => state().pages),
    loading: computed(() => state().loading),
    failed: computed(() => state().failed),
    load,
    retry: () => {
      const { failed } = untracked(state);
      if (failed !== undefined) load(failed);
    },
  };
}
