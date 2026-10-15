import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, InputSignal, computed, input } from '@angular/core';
import { newsImageUrl, OsrsNewsItem } from '@app/common/api/osrs-tracker-repo';

/** A news post: image, date and category, title and text; the whole card links to the post. */
@Component({
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.html',
  imports: [NgOptimizedImage, DatePipe],
})
export default class OsrsNewsCard {
  readonly osrsNewsItem: InputSignal<OsrsNewsItem> = input.required();
  readonly imageSrc = computed(() => newsImageUrl(this.osrsNewsItem().enclosure.url));
}
