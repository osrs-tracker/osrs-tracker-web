import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoadingIndicatorService } from '../interceptors/loading-indicator.interceptor';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.component.html',
  styleUrls: ['./root-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootLayoutComponent {
  routes = [
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

  constructor(public loadingIndicatorService: LoadingIndicatorService<unknown>) {}
}
