import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TermsComponent } from './terms.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{ title: 'Terms - OSRS Tracker', path: '', pathMatch: 'full', component: TermsComponent }]),
  ],
  declarations: [TermsComponent],
})
export class TermsModule {}
