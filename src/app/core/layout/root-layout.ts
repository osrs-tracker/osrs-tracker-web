import { Component, Signal, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConsentService } from '@app/common/analytics/consent-service';
import { LoadingIndicatorService } from '@app/core/interceptors/loading-indicator-interceptor';
import { ConsentBanner } from './consent-banner';
import { DarkMode } from './dark-mode';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.html',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ConsentBanner, DarkMode],
})
export default class RootLayout {
  readonly consentService = inject(ConsentService);
  readonly hasOngoingRequests: Signal<boolean> = inject(LoadingIndicatorService).hasOngoingRequests;

  readonly currentYear = new Date().getFullYear();

  readonly routes = [
    {
      path: '/',
      name: 'Home',
    },
    {
      path: '/trackers/xp',
      name: 'XP Tracker',
    },
    {
      path: '/trackers/price',
      name: 'Price Tracker',
    },
  ];

  constructor() {
    // After hydration: whether the banner stays depends on this device's choice, which the server can't know
    afterNextRender(() => this.consentService.init());
  }
}
