import { InjectionToken } from '@angular/core';

/** Provided by routes that show many icons at once, so their chunk carries the icons instead of a request each. */
export const LOCAL_ICONS = new InjectionToken<Readonly<Record<string, string>>>('LOCAL_ICONS');
