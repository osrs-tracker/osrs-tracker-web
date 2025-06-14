import { NgOptimizedImage } from '@angular/common';
import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OsrsNewsItem } from 'src/app/common/repositories/osrs-proxy.repo';
import { ThemeService } from 'src/app/common/services/theme.service';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  imports: [NgOptimizedImage, RouterLink, OsrsNewsCardComponent, OsrsNewsCardSkeletonComponent],
})
export default class HomeComponent {
  private readonly themeService = inject(ThemeService);
  readonly isDarkMode: Signal<boolean> = computed(() => this.themeService.darkMode());

  readonly osrsNewsItems: HttpResourceRef<OsrsNewsItem[]> = httpResource(() => '/news', { defaultValue: [] });
}
