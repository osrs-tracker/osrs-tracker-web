import { Component } from '@angular/core';
import { Skeleton } from '@app/common/ui/loading/skeleton';

@Component({
  selector: 'osrs-news-card-skeleton',
  templateUrl: './osrs-news-card-skeleton.html',
  imports: [Skeleton],
})
export class OsrsNewsCardSkeleton {}
