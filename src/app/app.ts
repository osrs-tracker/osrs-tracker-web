import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'root',
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
export class App {}
