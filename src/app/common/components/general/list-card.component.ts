import { Component, input, InputSignal, output, Resource } from '@angular/core';
import { ListRowSkeletonComponent } from './list-row-skeleton.component';
import { LoadErrorComponent } from './load-error.component';

export type ListCardState = 'ready' | 'loading' | 'empty' | 'error';

/** The state of a list card showing a resource's list. */
export function listCardState(resource: Resource<readonly unknown[] | undefined>): ListCardState {
  if (resource.isLoading()) return 'loading';
  if (resource.error()) return 'error';
  return resource.hasValue() && resource.value()?.length ? 'ready' : 'empty';
}

/**
 * A card with a list of player or item rows (the projected content), a two-line header with an optional `[icon]`,
 * `[info]` tooltip, count and `[actions]`, and loading (skeleton rows), empty and error states. The list scrolls past
 * 390px.
 */
@Component({
  selector: 'section[list-card]',
  template: `
    <div class="flex items-center gap-3 px-5 max-sm:px-4 py-4 max-sm:py-3 border-b border-line">
      <ng-content select="[icon]" />
      <div class="flex-1 min-w-0">
        <h2 class="flex items-center text-xl/6 font-bold text-strong">
          {{ heading() }}
          <ng-content select="[info]" />
        </h2>
        <p class="mt-1 text-sm/4.5 text-muted">{{ subtitle() }}</p>
      </div>

      @if (count() !== undefined && state() === 'ready') {
        <span
          class="flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-ground text-sm font-bold text-strong tabular-nums"
          [attr.aria-label]="count() + ' in this list'"
        >
          {{ count() }}
        </span>
      }
      <ng-content select="[actions]" />
    </div>

    @switch (state()) {
      @case ('ready') {
        <div class="flex flex-col max-h-97.5 overflow-y-auto">
          <ng-content />
        </div>
      }
      @case ('loading') {
        <div class="flex flex-col">
          <span class="sr-only">Loading {{ heading() }}</span>
          @for (index of SKELETON_ROWS; track index) {
            <list-row-skeleton [kind]="kind()" [index]="index" />
          }
        </div>
      }
      @case ('empty') {
        <div class="flex flex-col items-center gap-1 px-5 py-8 text-center">
          <p class="font-bold text-strong">{{ emptyText() }}</p>
          <p class="text-sm text-muted">{{ emptyHint() }}</p>
        </div>
      }
      @case ('error') {
        <load-error [source]="errorSource()" [message]="errorText()" (retry)="retry.emit()" />
      }
    }
  `,
  host: {
    'class': 'block rounded-2xl bg-card overflow-hidden',
    '[attr.aria-busy]': "state() === 'loading'",
  },
  imports: [ListRowSkeletonComponent, LoadErrorComponent],
})
export class ListCardComponent {
  readonly SKELETON_ROWS = [0, 1, 2, 3, 4];

  readonly heading: InputSignal<string> = input.required();
  readonly subtitle: InputSignal<string> = input.required();
  readonly kind: InputSignal<'player' | 'item'> = input.required();
  readonly state: InputSignal<ListCardState> = input.required();
  /** Shown in the header when set and the list is ready. */
  readonly count: InputSignal<number | undefined> = input();
  readonly emptyText: InputSignal<string> = input('Nothing here yet.');
  readonly emptyHint: InputSignal<string> = input('');
  /** The `load-error` source for analytics; required for lists that can fail to load. */
  readonly errorSource: InputSignal<string> = input('list-card');
  readonly errorText: InputSignal<string> = input("Couldn't load this list.");

  readonly retry = output<void>();
}
