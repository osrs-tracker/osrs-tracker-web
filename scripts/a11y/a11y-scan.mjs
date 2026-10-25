// Prints one line per violation (rule, impact, node count, selectors) and each page's incomplete count. Exits 1 on
// violations, 2 when a page can't be scanned.
//   npm run a11y -- [--light] [--click=<selector>]... <url>...
// --light scans the light theme (dark is the default, as most visitors use it). Each --click clicks that element after
// the page loads, in order, to scan an open state (a menu, a dialog). Needs Playwright's headless Chromium once:
// `npx playwright install --only-shell chromium`.
// A clean scan doesn't make a page accessible: axe finds only part of the issues (docs/decisions.md).
import AxeBuilder from '@axe-core/playwright';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']; // without wcag22aa, target-size never runs
const MAX_SELECTORS = 5;

const USAGE = 'Usage: npm run a11y -- [--light] [--click=<selector>]... <url>...';
let light, clicks, urls;
try {
  // strict: a mistyped flag fails instead of being scanned as if it weren't there
  const { values, positionals } = parseArgs({
    options: { light: { type: 'boolean', default: false }, click: { type: 'string', multiple: true, default: [] } },
    allowPositionals: true,
    strict: true,
  });
  ({ light, click: clicks } = values);
  urls = positionals;
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}
if (!urls.length) {
  console.error(USAGE);
  process.exit(2);
}

let exitCode = 0;
const browser = await chromium.launch().catch(error => {
  console.error(`Can't start Chromium: ${error.message.split('\n')[0]}`);
  process.exit(2);
});
try {
  const context = await browser.newContext({
    colorScheme: light ? 'light' : 'dark',
    viewport: { width: 1280, height: 800 },
  });
  for (const url of urls) {
    const page = await context.newPage();
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
      for (const selector of clicks) {
        await page.locator(selector).click();
        await page.waitForLoadState('networkidle');
      }
      const { violations, incomplete } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const { id, impact, nodes } of violations) {
        const targets = nodes.map(node => node.target.join(' >> '));
        const more = targets.length > MAX_SELECTORS ? ` (+${targets.length - MAX_SELECTORS} more)` : '';
        console.log(`${url} ${id} ${impact} ${nodes.length}: ${targets.slice(0, MAX_SELECTORS).join(', ')}${more}`);
      }
      console.log(`${url} incomplete ${incomplete.length}`);
      if (violations.length) exitCode ||= 1;
    } catch (error) {
      console.log(`${url} ERROR ${error.message.split('\n')[0]}`);
      exitCode = 2;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
process.exit(exitCode);
