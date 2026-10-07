import { DecimalPipe } from '@angular/common';
import { Component, ResourceRef, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { PlayerSearchComponent } from './player-search.component';
import { PlayerWidgetComponent } from './player-widget/player-widget.component';
import { XpTrackerStore } from './xp-tracker.store';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    LoadErrorComponent,
    TooltipComponent,
    PageHeaderComponent,
    PlayerSearchComponent,
    PlayerWidgetComponent,
    SpinnerComponent,
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

  updateScrapingOffset(offset: number): void {
    this.xpTrackerStore.setScrapingOffset(offset);
  }
}
