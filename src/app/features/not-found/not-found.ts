import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { BackButton } from '@app/common/components/general/back-button';
import { StatusPanel } from '@app/common/components/general/status-panel';

@Component({
  selector: 'not-found-404',
  imports: [BackButton, StatusPanel],
  template: `
    <main class="max-w-page mx-auto px-4 sm:px-6 pt-12 pb-18">
      <status-panel
        icon="search"
        heading="Page not found"
        message="This page doesn’t exist. The link may be wrong, or the page has moved."
      >
        <back-button />
      </status-panel>
    </main>
  `,
})
export default class NotFound {
  constructor() {
    // Only available during SSR, `null` in the browser
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 404;
  }
}
