import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { formatSign } from '@app/common/format/number-format';
import { XpTrackerStore } from './xp-tracker-store';

@Component({
  selector: 'tracking-offset',
  template: `
    <!-- The info button sits beside the label, not in it, so it isn't part of the select's name -->
    <span class="flex items-center">
      <label for="tracking-offset">Tracking offset</label>
      <info-tooltip label="About the tracking offset">
        <ng-template>
          <div class="pb-1">
            The tracking offset picks which set of hiscores is shown: +02:00 UTC only shows hiscores tracked at 02:00
            UTC.
          </div>
          <div>
            A player is only tracked from the first time they are looked up, so a new offset may have no hiscores yet.
          </div>
        </ng-template>
      </info-tooltip>
    </span>
    <select
      id="tracking-offset"
      class="h-8 pl-2 pr-8 py-0 rounded-xl border-border bg-card font-bold text-strong tabular-nums cursor-pointer focus:border-accent focus:ring-accent"
      name="scrapingOffset"
      [ngModel]="scrapingOffset()"
      (ngModelChange)="setOffset($event)"
    >
      @for (offset of SCRAPING_OFFSETS; track offset) {
        <option [ngValue]="offset">{{ offsetLabel(offset) }}</option>
      }
    </select>
    <span>Showing hiscores tracked at {{ trackedAt() }}</span>
  `,
  host: { class: 'flex flex-wrap items-center gap-x-3 gap-y-2 min-h-8 text-sm text-muted' },
  imports: [FormsModule, InfoTooltip],
})
export class TrackingOffset {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly xpTrackerStore = inject(XpTrackerStore);

  readonly SCRAPING_OFFSETS: number[] = Array.from({ length: 24 }, (_, i) => i - 12);
  readonly scrapingOffset = this.xpTrackerStore.scrapingOffset;
  readonly trackedAt = computed(() => `${pad((this.scrapingOffset() + 24) % 24)}:00 UTC`);

  setOffset(offset: number): void {
    this.xpTrackerStore.setScrapingOffset(offset);
    this.analyticsService.trackOption('tracking_offset', offset);
  }

  /** E.g. "+02:00 UTC", "−03:00 UTC" (a true minus) or "00:00 UTC". */
  offsetLabel(offset: number): string {
    return `${formatSign(offset, 'exceptZero')}${pad(Math.abs(offset))}:00 UTC`;
  }
}

const pad = (hours: number): string => String(hours).padStart(2, '0');
