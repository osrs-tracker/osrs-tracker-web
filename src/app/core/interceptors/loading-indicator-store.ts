import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

/** The requests the loading bar waits for */
export const LoadingIndicatorStore = signalStore(
  { providedIn: 'root' },
  withState({ _ongoingRequests: 0 }),
  withComputed(({ _ongoingRequests }) => ({
    hasOngoingRequests: computed<boolean>(() => _ongoingRequests() > 0),
  })),
  withMethods(store => ({
    addRequest(): void {
      patchState(store, ({ _ongoingRequests }) => ({ _ongoingRequests: _ongoingRequests + 1 }));
    },

    removeRequest(): void {
      patchState(store, ({ _ongoingRequests }) => ({ _ongoingRequests: _ongoingRequests - 1 }));
    },
  })),
);
