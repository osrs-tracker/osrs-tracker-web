import { InjectionToken } from '@angular/core';

/**
 * Icon data URIs (`localIcons` in local-icons.generated.ts), keyed by their path under `/assets/icons`. Provided by
 * routes that show many icons at once, so their chunk carries the icons instead of each one being a separate request.
 */
export const LOCAL_ICONS = new InjectionToken<Readonly<Record<string, string>>>('LOCAL_ICONS');
