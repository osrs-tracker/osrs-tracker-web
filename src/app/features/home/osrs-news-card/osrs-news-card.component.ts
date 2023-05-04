import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OsrsNewsItem } from 'src/app/common/services/repositories/osrs-proxy.repo';

@Component({
  standalone: true,
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, DatePipe],
})
export default class OsrsNewsCardComponent {
  @Input() osrsNewsItem: OsrsNewsItem;

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
