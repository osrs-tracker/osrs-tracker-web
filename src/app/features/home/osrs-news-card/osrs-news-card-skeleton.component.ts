import { Component } from '@angular/core';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';

@Component({
  selector: 'osrs-news-card-skeleton',
  templateUrl: './osrs-news-card-skeleton.component.html',
  imports: [SkeletonComponent],
})
export class OsrsNewsCardSkeletonComponent {}
