import { AsyncPipe } from '@angular/common';
import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { marked } from 'marked';
import { InformationPageComponent } from 'src/app/common/components/layout/information-page.component';

@Component({
  selector: 'changelog',
  template: `
    <information-page title="Changelog">
      <div class="prose dark:prose-invert max-w-none" [innerHTML]="markdown() | async"></div>
    </information-page>
  `,
  imports: [AsyncPipe, InformationPageComponent],
})
export default class ChangelogComponent {
  readonly changelog: InputSignal<string> = input('loading');

  readonly markdown: Signal<Promise<string>> = computed(async () => marked(this.changelog()));
}
