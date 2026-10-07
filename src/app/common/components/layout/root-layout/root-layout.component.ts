import { Component, Signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoadingIndicatorService } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { DarkModeComponent } from './components/dark-mode.component';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.component.html',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DarkModeComponent],
})
export default class RootLayoutComponent {
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
