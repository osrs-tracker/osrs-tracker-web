import { ErrorHandler } from '@angular/core';

export class CustomErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    if (gtag) {
      gtag('event', 'exception', { description: error.message });
    }
    window.console.error(error);
  }
}
