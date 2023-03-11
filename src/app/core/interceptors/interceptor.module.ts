import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BaseUrlInterceptor } from './base-url.interceptors';

@NgModule({
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: BaseUrlInterceptor, multi: true }],
})
export class InterceptorsModule {}
