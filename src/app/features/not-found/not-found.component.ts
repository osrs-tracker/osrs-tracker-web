import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'not-found-404',
  template: `
    <header class="container mx-auto py-48 sm:py-72">
      <h1 class="flex flex-col items-center text-center">
        <span class="text-7xl sm:text-8xl lg:text-9xl font-bold text-slate-900 dark:text-white">404</span>
        <span class="accent text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 sm:mt-3 lg:mt-4">NOT FOUND</span>
      </h1>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundComponent {}
