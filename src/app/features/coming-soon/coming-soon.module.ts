import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { ComingSoonComponent } from './coming-soon.component';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([{ path: '', pathMatch: 'full', component: ComingSoonComponent }])],
  declarations: [ComingSoonComponent],
})
export class ComingSoonModule {}
