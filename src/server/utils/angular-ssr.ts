import { APP_BASE_HREF } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { CommonEngine } from '@angular/ssr/node';
import * as domain from 'domain';
import { serverConfig } from '../server-config';

/** The common engine instance */
const commonEngine = new CommonEngine();

/**
 * Core function for rendering Angular pages with SSR, can be reused for prerendering specific routes.
 *
 * Will return null if an error occurs.
 */
export async function renderWithSsr(
  bootstrap: () => Promise<ApplicationRef>,
  url: string,
  baseUrl?: string,
): Promise<string | null> {
  return new Promise(resolve => {
    // Create a domain to handle errors
    const d = domain.create();

    d.on('error', (err: Error) => {
      // eslint-disable-next-line no-console
      console.error(`Error during SSR for "${url}":`, err.message);
      resolve(null);
    });

    d.run(async () => {
      const page = await commonEngine.render({
        bootstrap,
        documentFilePath: serverConfig.indexHtml,
        url: url,
        publicPath: serverConfig.browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl ?? '/' }],
      });
      resolve(page);
    });
  });
}
