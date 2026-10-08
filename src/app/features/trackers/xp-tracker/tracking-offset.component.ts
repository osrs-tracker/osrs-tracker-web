import { Component, Signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { XpTrackerStore } from './xp-tracker.store';

/** The tracking offset select (stored in `XpTrackerStore`) with its explanation and the UTC hour it shows. */
@Component({
  selector: 'tracking-offset',
  template: `
    <label for="tracking-offset" class="flex items-center">
      Tracking offset
      <info-tooltip>
        <div class="pb-1">
          The tracking offset picks which set of hiscores is shown: +02:00 UTC only shows hiscores tracked at 02:00 UTC.
        </div>
        <div>
          A player is only tracked from the first time they are looked up, so a new offset may have no hiscores yet.
        </div>
      </info-tooltip>
    </label>
    <select
      id="tracking-offset"
      class="h-8 pl-2 pr-8 py-0 rounded-xl border-line bg-card font-bold text-strong tabular-nums cursor-pointer focus:border-accent focus:ring-accent"
      name="scrapingOffset"
      [ngModel]="scrapingOffset()"
      (ngModelChange)="xpTrackerStore.setScrapingOffset($event)"
    >
      @for (offset of SCRAPING_OFFSETS; track offset) {
        <option [ngValue]="offset">{{ offsetLabel(offset) }}</option>
      }
    </select>
    <span>Showing hiscores tracked at {{ trackedAt() }}</span>
  `,
  host: { class: 'flex flex-wrap items-center gap-x-3 gap-y-2 min-h-8 text-sm text-muted' },
  imports: [FormsModule, InfoTooltipComponent],
})
export class TrackingOffsetComponent {
  readonly xpTrackerStore = inject(XpTrackerStore);

  readonly SCRAPING_OFFSETS: number[] = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11
  readonly scrapingOffset: Signal<number> = this.xpTrackerStore.scrapingOffset;
  /** The UTC hour the shown hiscores were tracked at, e.g. "21:00 UTC" for −03:00. */
  readonly trackedAt: Signal<string> = computed(() => `${pad((this.scrapingOffset() + 24) % 24)}:00 UTC`);

  /** E.g. "+02:00 UTC", "−03:00 UTC" (a true minus) or "00:00 UTC". */
  offsetLabel(offset: number): string {
    const sign = offset > 0 ? '+' : offset < 0 ? '−' : '';
    return `${sign}${pad(Math.abs(offset))}:00 UTC`;
  }
}

const pad = (hours: number): string => String(hours).padStart(2, '0');
