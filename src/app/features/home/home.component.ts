import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { OsrsNewsItem, OsrsProxyRepo } from 'src/app/services/osrs-proxy.repo';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  osrsNewsItems: OsrsNewsItem[] = [];

  constructor(private cdRef: ChangeDetectorRef, private osrsProxyRepo: OsrsProxyRepo) {}

  ngOnInit(): void {
    this.osrsProxyRepo.getOSRSNews().subscribe((newsItems) => {
      this.osrsNewsItems = newsItems.slice(0, 4);
      this.cdRef.markForCheck();
    });
  }
}
