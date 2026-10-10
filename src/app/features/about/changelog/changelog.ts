import { AsyncPipe } from '@angular/common';
import { Component, InputSignal, Signal, computed, input } from '@angular/core';
import { marked } from 'marked';
import { InformationPage } from '@app/common/components/layout/information-page';

@Component({
  selector: 'changelog',
  template: `
    <information-page title="Changelog">
      <div class="markdown" [innerHTML]="markdown() | async"></div>
    </information-page>
  `,
  imports: [AsyncPipe, InformationPage],
})
export default class Changelog {
  readonly changelog: InputSignal<string> = input('loading');

  readonly markdown: Signal<Promise<string>> = computed(async () => marked(this.changelog()));
}
