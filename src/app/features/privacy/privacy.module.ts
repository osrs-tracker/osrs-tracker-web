import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { PrivacyComponent } from './privacy.component';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild([
      { title: 'Privacy - OSRS Tracker', path: '', pathMatch: 'full', component: PrivacyComponent },
    ]),
  ],
  declarations: [PrivacyComponent],
})
export class PrivacyModule {}
