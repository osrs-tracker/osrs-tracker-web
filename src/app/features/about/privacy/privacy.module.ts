import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PrivacyComponent } from './privacy.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { title: 'Privacy - OSRS Tracker', path: '', pathMatch: 'full', component: PrivacyComponent },
    ]),
  ],
  declarations: [PrivacyComponent],
})
export class PrivacyModule {}
