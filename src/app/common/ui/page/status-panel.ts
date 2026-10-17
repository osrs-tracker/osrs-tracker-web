import { Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideClock,
  LucideDynamicIcon,
  LucideIcon,
  LucideSearch,
  LucideSearchX,
  LucideTriangleAlert,
} from '@lucide/angular';

type StatusPanelIcon = 'search' | 'alert' | 'clock';

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
      <svg class="size-10" [lucideIcon]="icons[icon()]" />
    </span>

    <div class="flex flex-col items-center gap-2">
      @if (headingLevel() === 1) {
        <h1 class="text-3xl/8.5 font-bold text-strong">{{ heading() }}</h1>
      } @else {
        <h2 class="text-3xl/8.5 font-bold text-strong">{{ heading() }}</h2>
      }
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
            <svg lucideSearch class="size-4.5" strokeWidth="2.5" />
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
  imports: [FormsModule, LucideDynamicIcon, LucideSearch],
})
export class StatusPanel {
  protected readonly icons: Record<StatusPanelIcon, LucideIcon> = {
    search: LucideSearchX,
    alert: LucideTriangleAlert,
    clock: LucideClock,
  };

  readonly icon = input<StatusPanelIcon>('search');
  readonly action = input<'search' | 'retry' | 'none'>('none');
  readonly heading = input.required<string>();
  readonly message = input('');
  /** 1 when the panel is the page's content (e.g. not found), 2 when it sits under a page heading */
  readonly headingLevel = input<1 | 2>(1);

  /** The search box's initial value, e.g. the name that wasn't found */
  readonly initialQuery = input('');
  readonly placeholder = input('');
  readonly searchLabel = input('Search');

  readonly searched = output<string>();
  readonly retry = output();

  readonly query = linkedSignal(() => this.initialQuery());

  onSearch(event: Event): void {
    event.preventDefault();
    const query = this.query().trim();
    if (query) this.searched.emit(query);
  }
}
