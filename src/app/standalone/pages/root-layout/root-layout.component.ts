import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoadingIndicatorService } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { DarkModeComponent } from './components/dark-mode/dark-mode.component';
import { MenuButtonComponent } from './components/menu-button/menu-button.component';

@Component({
  standalone: true,
  selector: 'app-root-layout',
  templateUrl: './root-layout.component.html',
  styleUrls: ['./root-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, DarkModeComponent, MenuButtonComponent],
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
