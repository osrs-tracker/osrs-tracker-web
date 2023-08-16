import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'osrs-news-card-skeleton',
  templateUrl: './osrs-news-card-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OsrsNewsCardSkeletonComponent {}
