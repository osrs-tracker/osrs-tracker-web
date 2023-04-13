import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(swUpdate: SwUpdate) {
    swUpdate.checkForUpdate().then(updated => {
      if (updated) window.console.log('Update available, please refresh.');
    });
  }
}
