import { Component, ResourceRef, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { ListCardComponent, ListCardState, listCardState } from 'src/app/common/components/general/list-card.component';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { TrackerHeroComponent } from '../tracker-hero.component';
import { PlayerSearchComponent } from './player-search.component';
import { PlayerRowComponent } from './player-row/player-row.component';
import { XpTrackerStore } from './xp-tracker.store';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [
    FormsModule,
    RouterLink,
    InfoTooltipComponent,
    ListCardComponent,
    IconDirective,
    TrackerHeroComponent,
    PlayerSearchComponent,
    PlayerRowComponent,
  ],
})
export default class XpTrackerComponent {
  readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  readonly xpTrackerStore = inject(XpTrackerStore);

  readonly SCRAPING_OFFSETS = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11
  readonly scrapingOffset = this.xpTrackerStore.scrapingOffset;
  /** The UTC hour the shown hiscores were tracked at, e.g. "21:00 UTC" for −03:00. */
  readonly trackedAt: Signal<string> = computed(() => `${pad((this.scrapingOffset() + 24) % 24)}:00 UTC`);

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    params: () => ({ offset: this.scrapingOffset() }),
    stream: ({ params: { offset } }) => this.osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });
  readonly recentPlayerLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentPlayerLookups));

  /** E.g. "+02:00 UTC", "−03:00 UTC" (a true minus) or "00:00 UTC". */
  offsetLabel(offset: number): string {
    const sign = offset > 0 ? '+' : offset < 0 ? '−' : '';
    return `${sign}${pad(Math.abs(offset))}:00 UTC`;
  }

  updateScrapingOffset(offset: number): void {
    this.xpTrackerStore.setScrapingOffset(offset);
  }
}

const pad = (hours: number): string => String(hours).padStart(2, '0');
