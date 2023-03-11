import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { InterceptorsModule } from './interceptors/interceptor.module';
import { DarkModeService } from './root-layout/components/dark-mode/dark-mode.service';
import { RootLayoutModule } from './root-layout/root-layout.module';

@NgModule({
  imports: [HttpClientModule, InterceptorsModule, RootLayoutModule],
  providers: [
    {
      // load dark mode on app start
      provide: APP_INITIALIZER,
      useFactory: (darkModeService: DarkModeService) => () => darkModeService.loadDarkMode(),
      deps: [DarkModeService],
      multi: true,
    },
  ],
})
export class CoreModule {}
