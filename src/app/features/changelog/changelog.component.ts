import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { marked } from 'marked';
import { map } from 'rxjs';
import { InformationPageComponent } from 'src/app/common/components/information-page.component';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';

@Component({
  standalone: true,
  selector: 'changelog',
  template: `
    <information-page title="Changelog">
      <div [innerHTML]="markdown()"></div>
    </information-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InformationPageComponent],
})
export default class ChangelogComponent {
  private CHANGELOG_URL: string = 'https://raw.githubusercontent.com/osrs-tracker/osrs-tracker-web/main/CHANGELOG.md';

  markdown: Signal<string>;

  constructor(private httpClient: HttpClient) {
    this.markdown = toSignal(
      this.httpClient
        .get(this.CHANGELOG_URL, { responseType: 'text', context: new HttpContext().set(BASE_URL_PREFIX, false) })
        .pipe(map(data => marked(data))),
      { initialValue: 'Loading...' },
    );
  }
}
