import { InjectionToken } from '@angular/core';
import { Response } from 'express';

/**
 * Token for the Express `Response` object.
 *
 * This is used to inject the response object into Angular services.
 * It is only available during server-side rendering (SSR), and not during prerendering.
 */
export const RESPONSE: InjectionToken<Response | null> = new InjectionToken<Response>('RESPONSE');
