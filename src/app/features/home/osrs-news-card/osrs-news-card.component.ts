import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { OsrsNewsItem } from 'src/app/common/repositories/osrs-proxy.repo';
import { config } from 'src/config/config';

@Component({
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.component.html',
  imports: [NgOptimizedImage, DatePipe],
})
export default class OsrsNewsCardComponent {
  readonly osrsNewsItem: InputSignal<OsrsNewsItem> = input.required();
  readonly imageSrc: Signal<string> = computed(
    () => `${config.apiBaseUrl}/news/image?url=${this.osrsNewsItem().enclosure.url}`,
  );

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
