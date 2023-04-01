import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.component.html',
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
}
