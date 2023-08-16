import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { OsrsNewsItem } from 'src/app/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/repositories/osrs-tracker.repo';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  standalone: true,
  selector: 'home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, OsrsNewsCardComponent, OsrsNewsCardSkeletonComponent],
})
export default class HomeComponent {
  osrsNewsItems: Signal<OsrsNewsItem[] | undefined>;

  constructor(private osrsTrackerRepo: OsrsTrackerRepo) {
    this.osrsNewsItems = toSignal(
      this.osrsTrackerRepo.getLatestOsrsNewsItems().pipe(map(osrsNewsItems => osrsNewsItems.slice(0, 4))),
    );
  }
}
