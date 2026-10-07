import { Component, inject, RESPONSE_INIT } from '@angular/core';
import { BackButtonComponent } from 'src/app/common/components/general/back-button.component';

@Component({
  selector: 'not-found-404',
  imports: [BackButtonComponent],
  template: `
    <header class="container mx-auto py-48 sm:py-72">
      <h1 class="flex flex-col items-center text-center">
        <span class="text-7xl sm:text-8xl lg:text-9xl font-bold text-strong">404</span>
        <span class="accent text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 sm:mt-3 lg:mt-4">NOT FOUND</span>
      </h1>
      <div class="flex justify-center mt-8 sm:mt-12">
        <back-button />
      </div>
    </header>
  `,
})
export default class NotFoundComponent {
  constructor() {
    // Only available during SSR, `null` in the browser
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) responseInit.status = 404;
  }
}
