import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef } from '@angular/core';

@Component({
  standalone: true,
  selector: 'page-header',
  template: `
    <header class="container mx-auto pt-20 pb-16 md:pt-24 md:pb-20 text-center">
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white">{{ headerText }}</h1>
      <p class="mt-12 flex flex-col items-center relative">
        <ng-content />
      </p>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
})
export class PageHeaderComponent {
  @Input() headerText: string;
  @ContentChild(TemplateRef) content: TemplateRef<any>;
}
