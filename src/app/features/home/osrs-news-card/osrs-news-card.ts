import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { OsrsNewsItem } from '@app/common/repositories/osrs-tracker-repo';
import { config } from '@config/config';

/** A news post: image, date and category, title and text; the whole card links to the post. */
@Component({
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.html',
  imports: [NgOptimizedImage, DatePipe],
})
export default class OsrsNewsCard {
  readonly osrsNewsItem: InputSignal<OsrsNewsItem> = input.required();
  readonly imageSrc: Signal<string> = computed(
    () => `${config.apiBaseUrl}/news/image?url=${encodeURIComponent(this.osrsNewsItem().enclosure.url)}`,
  );
}
