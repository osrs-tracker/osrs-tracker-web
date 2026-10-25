import { config } from '@config/config';
import express, { Router } from 'express';
import { getCspNonce } from '../middleware/csp-nonce';

/**
 * Hands the old host's (osrs-tracker.freekmencke.com) `localStorage` to the new origin in the URL fragment, which never
 * reaches a server. Consent is left behind: a crafted link could otherwise set it. The page is the same for every
 * request (the script reads `to` itself), so nothing from the request ends up in it. Temporary: removed in
 * osrs-tracker-web#453.
 */
export function createCarryOverRouter(): Router {
  const router = express.Router();

  router.get('/carry-over', (_req, res) => {
    res
      .status(200)
      .set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
      .type('html')
      .send(
        `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OSRS Tracker has moved</title>
<script nonce="${getCspNonce(res)}">
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== 'analytics-consent') data[key] = localStorage.getItem(key);
    }
  } catch {}
  const to = new URLSearchParams(location.search).get('to');
  const path = to && to.startsWith('/') ? to : '/';
  location.replace('${config.siteUrl}' + path + '#carry-over=' + encodeURIComponent(JSON.stringify(data)));
</script>
</head>
<body>
<p>OSRS Tracker has moved to <a href="${config.siteUrl}/">${new URL(config.siteUrl).host}</a>.</p>
</body>
</html>
`,
      );
  });

  return router;
}
