import { Component, ResourceRef, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { ListCard, ListCardState, listCardState } from '@app/common/components/general/list-card';
import { Icon } from '@app/common/directives/icon/icon';
import { OsrsTrackerRepo } from '@app/common/repositories/osrs-tracker-repo';
import { TrackerHero } from '../tracker-hero';
import { PlayerSearch } from './player-search';
import { PlayerRow } from './player-row/player-row';
import { TrackingOffset } from './tracking-offset';
import { XpTrackerStore } from './xp-tracker-store';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.html',
  imports: [RouterLink, ListCard, Icon, TrackerHero, PlayerSearch, PlayerRow, TrackingOffset],
})
export default class XpTracker {
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
