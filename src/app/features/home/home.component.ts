import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { OsrsNewsItem, OsrsProxyRepo } from 'src/app/services/repositories/osrs-proxy.repo';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  @trackChanges osrsNewsItems: OsrsNewsItem[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    public cdRef: ChangeDetectorRef,
    private osrsProxyRepo: OsrsProxyRepo,
  ) {}

  ngOnInit(): void {
    this.setNews(this.activatedRoute.snapshot.data['osrsNewsItems']);

    this.osrsProxyRepo.getOSRSNews().subscribe(osrsNewsItems => this.setNews(osrsNewsItems));
  }

  private setNews(osrsNewsItems: OsrsNewsItem[]): void {
    this.osrsNewsItems = osrsNewsItems.slice(0, 4);
  }
}
