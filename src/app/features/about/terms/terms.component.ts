import { Component } from '@angular/core';
import { InformationPageComponent } from 'src/app/common/components/layout/information-page.component';

@Component({
  standalone: true,
  selector: 'terms',
  templateUrl: './terms.component.html',
  imports: [InformationPageComponent],
})
export default class TermsComponent {}
