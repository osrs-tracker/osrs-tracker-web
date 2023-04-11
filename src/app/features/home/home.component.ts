import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { OsrsNewsItem } from 'src/app/services/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';
import { MetaService } from 'src/app/services/seo/meta.service';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  @trackChanges osrsNewsItems: OsrsNewsItem[] = [];

  constructor(public cdRef: ChangeDetectorRef, private meta: MetaService, private osrsTrackerRepo: OsrsTrackerRepo) {}

  ngOnInit(): void {
    this.meta.setHomeMeta();

    this.osrsTrackerRepo.getLatestOsrsNewsItems().subscribe(osrsNewsItems => this.setNews(osrsNewsItems));
  }

  private setNews(osrsNewsItems: OsrsNewsItem[]): void {
    this.osrsNewsItems = osrsNewsItems.slice(0, 4);
  }
}
