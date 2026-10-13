import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InformationPage } from '@app/common/ui/page/information-page';

@Component({
  selector: 'terms',
  templateUrl: './terms.html',
  imports: [InformationPage, RouterLink],
})
export default class Terms {}
