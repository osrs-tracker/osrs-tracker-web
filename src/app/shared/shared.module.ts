import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

const MODULES = [CommonModule];

@NgModule({
  exports: MODULES,
})
export class SharedModule {}
