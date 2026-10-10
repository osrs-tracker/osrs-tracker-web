import { Component, Signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoadingIndicatorService } from '@app/core/interceptors/loading-indicator-interceptor';
import { DarkMode } from './dark-mode';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.html',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DarkMode],
})
export default class RootLayout {
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
}
