import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@app/common/icon/icon';
import { BackButton } from '@app/common/ui/page/back-button';
import { StatusPanel } from '@app/common/ui/page/status-panel';

@Component({
  selector: 'not-found-404',
  imports: [BackButton, Icon, RouterLink, StatusPanel],
  template: `
    <div class="max-w-page mx-auto px-4 sm:px-6 pt-12 pb-18">
      <status-panel
        icon="search"
        heading="Page not found"
        message="This page doesn’t exist. The link may be wrong, or the page has moved. Look up a player or an item instead."
      >
        <div class="flex flex-wrap justify-center gap-3">
          <a routerLink="/trackers/xp" class="button--default button--rounded">
            <img icon class="size-5.5" name="overall" [skill]="true" alt="" />
            Look up a player
          </a>
          <a routerLink="/trackers/price" class="button--default button--rounded">
            <img icon name="coin stack" [scale]="1.5" alt="" />
            Search items
          </a>
        </div>
        <back-button />
      </status-panel>
    </div>
  `,
})
export default class NotFound {
  constructor() {
    // Only available during SSR, `null` in the browser
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 404;
  }
}
