import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InformationPageComponent } from 'src/app/common/components/information-page.component';

@Component({
  standalone: true,
  selector: 'privacy',
  templateUrl: './privacy.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InformationPageComponent],
})
export default class PrivacyComponent {}
