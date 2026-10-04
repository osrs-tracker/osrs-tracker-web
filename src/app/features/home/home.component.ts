import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { OsrsNewsItem, OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ThemeService } from 'src/app/common/services/theme.service';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  imports: [NgOptimizedImage, RouterLink, LoadErrorComponent, OsrsNewsCardComponent, OsrsNewsCardSkeletonComponent],
})
export default class HomeComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly themeService = inject(ThemeService);
  readonly isDarkMode: Signal<boolean> = computed(() => this.themeService.darkMode());

  readonly osrsNewsItems: ResourceRef<OsrsNewsItem[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getNews(),
    defaultValue: [],
  });
}
