import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DarkModeComponent } from './components/dark-mode/dark-mode.component';
import { MenuButtonComponent } from './components/menu-button/menu-button.component';
import { RootLayoutComponent } from './root-layout.component';

@NgModule({
  imports: [CommonModule, RouterModule],
  declarations: [RootLayoutComponent, DarkModeComponent, MenuButtonComponent],
})
export class RootLayoutModule {}
