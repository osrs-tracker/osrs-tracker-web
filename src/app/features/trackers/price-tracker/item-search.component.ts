import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { Subscription, finalize } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';

/** Item name search with a dropdown of matching items that link to their price pages. */
@Component({
  selector: 'item-search',
  host: { class: 'block w-full' },
  template: `
    <form autocomplete="off" class="relative">
      <input
        type="text"
        class="z-20 relative w-full input--default"
        placeholder="Enter search term"
        name="query"
        [(ngModel)]="query"
        autocomplete="hidden"
      />

      <button type="submit" class="z-20 absolute right-0 button--primary rounded-xl" (click)="searchItems()">
        <span [class.invisible]="loading()">Search</span>

        @if (loading()) {
          <spinner class="absolute top-0 left-0 w-full h-full flex items-center justify-center"></spinner>
        }
      </button>

      @if (error()) {
        <div class="z-10 absolute rounded-xl bg-card border border-line shadow-float top-0 w-full overflow-hidden">
          <div class="mt-10 pt-px">
            <load-error source="item-search" message="Couldn't search items." (retry)="searchItems()" />
          </div>
        </div>
      } @else if (results().length) {
        <div class="z-10 absolute rounded-xl bg-card border border-line shadow-float top-0 w-full overflow-hidden">
          <div class="mt-10 pt-px max-h-60 overflow-y-auto scroll-bar">
            <ul>
              @for (item of results(); track item.id) {
                <li>
                  <a
                    class="group flex items-center px-4 py-2 hover:bg-row text-strong"
                    [routerLink]="['/trackers/price', item.id]"
                  >
                    <div class="w-8 h-8 mr-3 flex justify-center items-center">
                      <img icon [name]="item.icon" [wiki]="true" />
                    </div>
                    <div class="grow text-left text-lg">{{ item.name }}</div>
                    <div class="hidden group-hover:block">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="w-6 h-6"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </a>
                </li>
              }
            </ul>
          </div>
        </div>
      }
    </form>
  `,
  imports: [FormsModule, RouterLink, IconDirective, LoadErrorComponent, SpinnerComponent],
})
export class ItemSearchComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);

  readonly query: WritableSignal<string> = signal('');
  readonly loading: WritableSignal<boolean> = signal(false);
  readonly results: WritableSignal<Item[]> = signal([]);
  readonly error: WritableSignal<boolean> = signal(false);

  private searchSubscription?: Subscription;

  searchItems(): void {
    this.error.set(false);
    if (!this.query()) return;

    // Cancel the previous search (before setting loading, as this runs its finalize), so a slow earlier response can't
    // overwrite a newer one
    this.searchSubscription?.unsubscribe();
    this.loading.set(true);

    this.searchSubscription = this.osrsTrackerRepo
      .searchItems(this.query())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: items => this.results.set(items ?? []),
        error: () => {
          this.results.set([]);
          this.error.set(true);
        },
      });
  }
}
