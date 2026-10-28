import { Component, input, output, Resource } from '@angular/core';
import { ListRowSkeleton } from './list-row-skeleton';
import { LoadError } from '../loading/load-error';

export type ListCardState = 'ready' | 'loading' | 'empty' | 'error';

export function listCardState(resource: Resource<readonly unknown[] | undefined>): ListCardState {
  if (resource.isLoading()) return 'loading';
  if (resource.error()) return 'error';
  return resource.hasValue() && resource.value()?.length ? 'ready' : 'empty';
}

@Component({
  selector: 'section[list-card]',
  template: `
    <div class="card-header flex-nowrap justify-start py-4">
      <ng-content select="[icon]" />
      <div class="flex-1 min-w-0">
        <!-- The info button sits beside the heading, not in it, so it isn't part of the heading's name -->
        <div class="flex items-center">
          <h2 class="text-xl/6 font-bold text-strong">{{ heading() }}</h2>
          <ng-content select="[info]" />
        </div>
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
        <div class="flex flex-col items-center gap-1 px-card py-8 text-center">
          <p class="font-bold text-strong">{{ emptyText() }}</p>
          <p class="text-sm text-muted">{{ emptyHint() }}</p>
        </div>
      }
      @case ('error') {
        <load-error [source]="errorSource()" [message]="errorText()" [error]="error()" (retry)="retry.emit()" />
      }
    }
    <ng-content select="[footer]" />
  `,
  host: {
    'class': 'block rounded-2xl bg-card overflow-hidden',
    '[attr.aria-busy]': "state() === 'loading'",
  },
  imports: [ListRowSkeleton, LoadError],
})
export class ListCard {
  readonly SKELETON_ROWS = [0, 1, 2, 3, 4];

  readonly heading = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly kind = input.required<'player' | 'item'>();
  readonly state = input.required<ListCardState>();
  readonly count = input<number>();
  readonly emptyText = input('Nothing here yet.');
  readonly emptyHint = input('');
  /** Required for lists that can fail to load */
  readonly errorSource = input('list-card');
  readonly errorText = input("Couldn't load this list.");
  readonly error = input<unknown>();

  readonly retry = output<void>();
}
