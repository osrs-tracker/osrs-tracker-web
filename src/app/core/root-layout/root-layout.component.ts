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
      path: '/price-tracker',
      name: 'Price Tracker',
    },
    {
      path: '/xp-tracker',
      name: 'XP Tracker',
    },
  ];

  menuCollapsed = true;
}
