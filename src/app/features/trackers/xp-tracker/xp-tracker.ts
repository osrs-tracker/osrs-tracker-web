import { formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { millisecondsInDay } from 'date-fns/constants';
import { ListCard, listCardState } from '@app/common/ui/cards/list-card';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { Icon } from '@app/common/icon/icon';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { TrackerHero } from '../tracker-hero';
import { PlayerSearch } from './player-search';
import { PlayerRow } from './player-row';
import { TopGainerRow } from './top-gainer-row';
import { TrackingOffset } from './tracking-offset';
import { XpTrackerStore } from './xp-tracker-store';

/**
 * Rows in the top gainers card: what a visitor reads, not more for the links alone (`docs/decisions.md`, "No visible
 * text for search engines only")
 */
const TOP_GAINERS = 10;

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.html',
  imports: [
    RouterLink,
    ListCard,
    InfoTooltip,
    Icon,
    TrackerHero,
    PlayerSearch,
    PlayerRow,
    TopGainerRow,
    TrackingOffset,
  ],
})
export default class XpTracker {
  readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  readonly xpTrackerStore = inject(XpTrackerStore);

  readonly scrapingOffset = this.xpTrackerStore.scrapingOffset;

  readonly recentPlayerLookups = rxResource({
    params: () => ({ offset: this.scrapingOffset() }),
    stream: ({ params: { offset } }) => this.osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });
  readonly recentPlayerLookupsState = computed(() => listCardState(this.recentPlayerLookups));

  /** Ranked at offset 0 whatever the visitor's tracking offset, so rendered on the server like the recent lookups */
  readonly topGainers = rxResource({
    stream: () => this.osrsTrackerRepo.getTopGainers(TOP_GAINERS),
    defaultValue: [],
  });
  readonly topGainersState = computed(() => listCardState(this.topGainers));
  /**
   * The UTC day the gains were made: the entries are from the 00:00 UTC scrape after it ("Sat 24 Oct" for entries of
   * 25 Oct). In the hour after midnight the API still serves the day before, which the date then shows.
   */
  readonly topGainersDay = computed(() => {
    const newest = this.topGainers.hasValue() ? this.topGainers.value()[0] : undefined;
    return newest ? formatDate(newest.date.getTime() - millisecondsInDay, 'EEE d MMM', 'en-US', 'UTC') : null;
  });
}
