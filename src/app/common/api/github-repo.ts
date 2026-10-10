import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BASE_URL_PREFIX } from '@app/core/interceptors/base-url-interceptor';

const CHANGELOG_URL = 'https://raw.githubusercontent.com/osrs-tracker/osrs-tracker-web/main/CHANGELOG.md';

@Service()
export class GithubRepo {
  private readonly httpClient = inject(HttpClient);

  /** The changelog as markdown, read from `main` so it's up to date without a deploy */
  getChangelog(): Observable<string> {
    return this.httpClient.get(CHANGELOG_URL, {
      responseType: 'text',
      context: new HttpContext().set(BASE_URL_PREFIX, false),
    });
  }
}
