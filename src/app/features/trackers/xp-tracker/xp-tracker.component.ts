import { DecimalPipe } from '@angular/common';
import { Component, ResourceRef, WritableSignal, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { SpinnerComponent } from '../../../common/components/general/spinner.component';
import { PlayerWidgetComponent } from './player-widget/player-widget.component';
import { XpTrackerStore } from './xp-tracker.store';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    TooltipComponent,
    PageHeaderComponent,
    PlayerWidgetComponent,
    SpinnerComponent,
  ],
})
export default class XpTrackerComponent {
  readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  readonly xpTrackerStore = inject(XpTrackerStore);

  readonly SCRAPING_OFFSETS = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11
  readonly scrapingOffset = this.xpTrackerStore.scrapingOffset;

  readonly usernameQuery: WritableSignal<string> = signal('');

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentPlayerLookups(),
    defaultValue: [],
  });

  updateScrapingOffset(offset: number): void {
    this.xpTrackerStore.setScrapingOffset(offset);
  }
}
