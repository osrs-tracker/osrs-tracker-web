import { Injectable } from '@angular/core';
import { XMLParser } from 'fast-xml-parser';
import { OsrsNewsItem } from '../repositories/osrs-proxy.repo';

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  xml = new XMLParser({
    attributeNamePrefix: '',
    textNodeName: '$text',
    ignoreAttributes: false,
  });

  parseRss(xml: string): OsrsNewsItem[] {
    const result = this.xml.parse(xml);

    return result.rss.channel.item.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (val: any) =>
        new OsrsNewsItem(val.title, new Date(val.pubDate), val.category, val.link, val.description, {
          url: val.enclosure.url,
          type: val.enclosure.type,
        }),
    );
  }
}
