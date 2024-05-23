import { Component } from '@angular/core';
import { InformationPageComponent } from 'src/app/common/components/layout/information-page.component';

@Component({
  standalone: true,
  selector: 'privacy',
  templateUrl: './privacy.component.html',
  imports: [InformationPageComponent],
})
export default class PrivacyComponent {}
