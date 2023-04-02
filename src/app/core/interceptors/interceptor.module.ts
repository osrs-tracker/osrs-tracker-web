import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BaseUrlInterceptor } from './base-url.interceptors';
import { LoadingIndicatorInterceptor } from './loading-indicator.interceptor';
import { ShareRequestInterceptor } from './share-request.interceptors';

@NgModule({
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: BaseUrlInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingIndicatorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ShareRequestInterceptor, multi: true },
  ],
})
export class InterceptorsModule {}
