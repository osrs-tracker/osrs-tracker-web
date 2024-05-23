import { DatePipe, NgOptimizedImage } from '@angular/common';
import { Component, InputSignal, input } from '@angular/core';
import { OsrsNewsItem } from 'src/app/common/repositories/osrs-proxy.repo';

@Component({
  standalone: true,
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.component.html',
  imports: [NgOptimizedImage, DatePipe],
})
export default class OsrsNewsCardComponent {
  osrsNewsItem: InputSignal<OsrsNewsItem> = input.required();

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
