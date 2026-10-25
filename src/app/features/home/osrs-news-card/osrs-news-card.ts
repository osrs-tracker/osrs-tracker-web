import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { OsrsNewsItem } from '@osrs-tracker/models';
import { newsImageUrl } from '@app/common/api/osrs-tracker-repo';

@Component({
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.html',
  imports: [NgOptimizedImage, DatePipe],
})
export default class OsrsNewsCard {
  readonly osrsNewsItem = input.required<OsrsNewsItem>();
  readonly imageSrc = computed(() => newsImageUrl(this.osrsNewsItem().enclosure.url));
}
