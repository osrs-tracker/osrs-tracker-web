import { NgOptimizedImage } from '@angular/common';
import { Component, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { OsrsNewsItem } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ThemeService } from 'src/app/common/services/theme.service';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  imports: [NgOptimizedImage, RouterLink, OsrsNewsCardComponent, OsrsNewsCardSkeletonComponent],
})
export default class HomeComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly themeService = inject(ThemeService);

  osrsNewsItems: Signal<OsrsNewsItem[] | undefined> = toSignal(
    this.osrsTrackerRepo.getLatestOsrsNewsItems().pipe(map(osrsNewsItems => osrsNewsItems.slice(0, 4))),
  );

  readonly isDarkMode: Signal<boolean> = computed(() => this.themeService.darkMode());
}
