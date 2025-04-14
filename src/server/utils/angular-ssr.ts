import { APP_BASE_HREF } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { CommonEngine } from '@angular/ssr/node';
import { serverConfig } from '../server-config';

/** The common engine instance */
const commonEngine = new CommonEngine();

/**
 * Core function for rendering Angular pages with SSR
 * Can be reused for prerendering specific routes
 */
export function renderWithSsr(
  bootstrap: () => Promise<ApplicationRef>,
  url: string,
  baseUrl?: string,
): Promise<string> {
  return commonEngine.render({
    bootstrap,
    documentFilePath: serverConfig.indexHtml,
    url: url,
    publicPath: serverConfig.browserDistFolder,
    providers: [{ provide: APP_BASE_HREF, useValue: baseUrl ?? '/' }],
  });
}
