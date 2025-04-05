import { AsyncPipe, NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoadingIndicatorService } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { DarkModeComponent } from './components/dark-mode.component';
import { MenuButtonComponent } from './components/menu-button.component';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.component.html',
  styleUrls: ['./root-layout.component.scss'],
  imports: [AsyncPipe, NgClass, RouterLink, RouterLinkActive, RouterOutlet, DarkModeComponent, MenuButtonComponent],
})
export default class RootLayoutComponent {
  readonly loadingIndicatorService = inject(LoadingIndicatorService);

  readonly currentYear = new Date().getFullYear();

  readonly routes = [
    {
      path: '/',
      name: 'Home',
    },
    {
      path: '/trackers/price',
      name: 'Price Tracker',
    },
    {
      path: '/trackers/xp',
      name: 'XP Tracker',
    },
  ];

  menuCollapsed = true;
}
