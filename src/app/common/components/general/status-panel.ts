import { Component, input, InputSignal, linkedSignal, output, OutputEmitterRef, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * A centred panel for a page-level state, such as a player that doesn't exist or data that's unavailable: an icon, a
 * heading, a message and an optional action (a search box or a retry button). Other actions, such as a back button,
 * go in as content, after the built-in one.
 */
@Component({
  selector: 'status-panel',
  template: `
    <span
      class="flex items-center justify-center size-20 rounded-full bg-ground"
      [class]="icon() === 'alert' ? 'text-amber' : icon() === 'clock' ? 'text-accent' : 'text-muted'"
      aria-hidden="true"
    >
      <svg
        class="size-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        @switch (icon()) {
          @case ('search') {
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8.5" y1="8.5" x2="13.5" y2="13.5" />
            <line x1="13.5" y1="8.5" x2="8.5" y2="13.5" />
          }
          @case ('alert') {
            <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          }
          @case ('clock') {
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15.5 14" />
          }
        }
      </svg>
    </span>

    <div class="flex flex-col items-center gap-2">
      <div role="heading" [attr.aria-level]="headingLevel()" class="text-3xl/8.5 font-bold text-strong">
        {{ heading() }}
      </div>
      <p class="max-w-md text-base/6 text-muted">{{ message() }}</p>
    </div>

    @switch (action()) {
      @case ('search') {
        <form
          class="self-stretch flex flex-wrap items-center gap-1.5 p-1.5 rounded-3xl border border-border bg-ground text-left focus-within:border-accent"
          (submit)="onSearch($event)"
        >
          <label class="sr-only" for="status-panel-search">{{ searchLabel() }}</label>
          <input
            id="status-panel-search"
            type="search"
            name="query"
            class="grow basis-45 min-w-0 h-12 px-3.5 border-0 bg-transparent text-lg text-strong placeholder:text-muted focus:ring-0"
            autocomplete="off"
            [placeholder]="placeholder()"
            [(ngModel)]="query"
          />
          <button type="submit" class="button--primary">
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
            Search
          </button>
        </form>
      }
      @case ('retry') {
        <button type="button" class="button--default button--rounded px-8" (click)="retry.emit()">Try again</button>
      }
    }

    <ng-content />
  `,
  host: {
    class: 'flex flex-col items-center gap-6 w-full max-w-160 mx-auto px-8 py-10 rounded-2xl bg-card text-center',
  },
  imports: [FormsModule],
})
export class StatusPanel {
  readonly icon: InputSignal<'search' | 'alert' | 'clock'> = input<'search' | 'alert' | 'clock'>('search');
  readonly action: InputSignal<'search' | 'retry' | 'none'> = input<'search' | 'retry' | 'none'>('none');
  readonly heading: InputSignal<string> = input.required();
  readonly message: InputSignal<string> = input('');
  /** 1 when the panel is the page's content (e.g. not found), 2 when it sits under a page heading */
  readonly headingLevel: InputSignal<1 | 2> = input<1 | 2>(1);

  /** The search box's initial value, e.g. the name that wasn't found */
  readonly initialQuery: InputSignal<string> = input('');
  readonly placeholder: InputSignal<string> = input('');
  readonly searchLabel: InputSignal<string> = input('Search');

  readonly searched: OutputEmitterRef<string> = output();
  readonly retry: OutputEmitterRef<void> = output();

  readonly query: WritableSignal<string> = linkedSignal(() => this.initialQuery());

  onSearch(event: Event): void {
    event.preventDefault();
    const query = this.query().trim();
    if (query) this.searched.emit(query);
  }
}
