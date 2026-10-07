import { Component, ResourceRef, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { ListCardComponent, ListCardState, listCardState } from 'src/app/common/components/general/list-card.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { TrackerHeroComponent } from '../tracker-hero.component';
import { PlayerSearchComponent } from './player-search.component';
import { PlayerRowComponent } from './player-row/player-row.component';
import { TrackingOffsetComponent } from './tracking-offset.component';
import { XpTrackerStore } from './xp-tracker.store';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [
    RouterLink,
    ListCardComponent,
    IconDirective,
    TrackerHeroComponent,
    PlayerSearchComponent,
    PlayerRowComponent,
    TrackingOffsetComponent,
  ],
})
export default class XpTrackerComponent {
  readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  readonly xpTrackerStore = inject(XpTrackerStore);

  readonly scrapingOffset: Signal<number> = this.xpTrackerStore.scrapingOffset;

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    params: () => ({ offset: this.scrapingOffset() }),
    stream: ({ params: { offset } }) => this.osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });
  readonly recentPlayerLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentPlayerLookups));
}
