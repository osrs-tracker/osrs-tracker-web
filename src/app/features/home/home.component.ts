import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ThemeService } from 'src/app/common/services/theme.service';
import { OsrsNewsItem } from 'src/app/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/repositories/osrs-tracker.repo';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  standalone: true,
  selector: 'home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, OsrsNewsCardComponent, OsrsNewsCardSkeletonComponent],
})
export default class HomeComponent {
  osrsNewsItems: Signal<OsrsNewsItem[] | undefined>;

  isDarkMode: Signal<boolean> = computed(() => this.themeService.darkMode());

  constructor(
    private osrsTrackerRepo: OsrsTrackerRepo,
    private themeService: ThemeService,
  ) {
    this.osrsNewsItems = toSignal(
      this.osrsTrackerRepo.getLatestOsrsNewsItems().pipe(map(osrsNewsItems => osrsNewsItems.slice(0, 4))),
    );
  }
}
