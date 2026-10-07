import { DecimalPipe } from '@angular/common';
import { Component, ResourceRef, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { ListCardComponent, ListCardState, listCardState } from 'src/app/common/components/general/list-card.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { PlayerSearchComponent } from './player-search.component';
import { PlayerRowComponent } from './player-row/player-row.component';
import { XpTrackerStore } from './xp-tracker.store';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    ListCardComponent,
    TooltipComponent,
    PageHeaderComponent,
    PlayerSearchComponent,
    PlayerRowComponent,
  ],
})
export default class XpTrackerComponent {
  readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  readonly xpTrackerStore = inject(XpTrackerStore);

  readonly SCRAPING_OFFSETS = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11
  readonly scrapingOffset = this.xpTrackerStore.scrapingOffset;

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    params: () => ({ offset: this.scrapingOffset() }),
    stream: ({ params: { offset } }) => this.osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });
  readonly recentPlayerLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentPlayerLookups));

  updateScrapingOffset(offset: number): void {
    this.xpTrackerStore.setScrapingOffset(offset);
  }
}
