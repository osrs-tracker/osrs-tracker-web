import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { OsrsNewsItem } from 'src/app/services/repositories/osrs-proxy.repo';

@Component({
  selector: 'osrs-news-card',
  templateUrl: './osrs-news-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OsrsNewsCardComponent {
  @Input() osrsNewsItem: OsrsNewsItem;

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
