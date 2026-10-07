// Compares the GE tax rules in ge-tax.ts with the OSRS Wiki and exits 1 when they differ.
// Imports the .ts helper directly, which relies on Node's type stripping (Node 24).
const { GE_TAX_CAP, GE_TAX_EXEMPT_IDS, GE_TAX_PERCENT } =
  await import('../../src/app/features/trackers/price-tracker/item-detail/ge-tax.ts');

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const MAPPING_API = 'https://prices.runescape.wiki/api/v1/osrs/mapping';
const HEADERS = { 'User-Agent': 'osrs-tracker-dev' };

const getJson = async url => {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
};

const wikiSection = async (sections, title) => {
  const section = sections.find(({ line }) => line === title);
  if (!section) throw new Error(`The Wiki's Grand Exchange page has no "${title}" section any more`);

  const url = `${WIKI_API}?action=parse&page=Grand_Exchange&prop=wikitext&format=json&section=${section.index}`;
  return (await getJson(url)).parse.wikitext['*'];
};

const problems = [];

const { sections } = (await getJson(`${WIKI_API}?action=parse&page=Grand_Exchange&prop=sections&format=json`)).parse;
const feeText = await wikiSection(sections, 'Convenience fee and item sink');
const exemptText = await wikiSection(sections, 'Exempt from tax');
const items = await getJson(MAPPING_API);

// Rate and cap: "Most transactions on the Grand Exchange are subject to a 2% tax, ..., capped at a maximum of 5 million"
const percent = Number(feeText.match(/subject to an? (\d+(?:\.\d+)?)% tax/)?.[1]);
const capMillions = Number(feeText.match(/maximum of (\d+(?:\.\d+)?) million/)?.[1]);
if (percent !== GE_TAX_PERCENT)
  problems.push(`Rate: Wiki says ${percent || 'nothing found'}%, ge-tax.ts ${GE_TAX_PERCENT}%`);
if (capMillions * 1_000_000 !== GE_TAX_CAP) {
  problems.push(
    `Cap: Wiki says ${capMillions || 'nothing found'} million, ge-tax.ts ${GE_TAX_CAP.toLocaleString('en')}`,
  );
}

// Exempt items: each [[link]] in the list. A display text with a dose or charge ("Games necklace(8)") names the item;
// otherwise the link target does (or its display text when the page and item names differ), and a name without a dose
// ("Energy potion") covers every dose.
const itemsNamed = name => {
  const lower = name.toLowerCase();
  const doses = !/\(\d+\)$/.test(lower) && new RegExp(`^${RegExp.escape(lower)}\\(\\d+\\)$`);
  return items.filter(item => item.name.toLowerCase() === lower || (doses && doses.test(item.name.toLowerCase())));
};
const wikiIds = new Map();
for (const [, target, display] of exemptText.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
  const candidates = display && /\(\d+\)$/.test(display) ? [display] : [target, display].filter(Boolean);
  const matches = candidates.map(itemsNamed).find(found => found.length > 0) ?? [];
  if (matches.length === 0) problems.push(`Exempt: no tradeable item is called "${candidates.join('" or "')}"`);
  for (const { id, name } of matches) wikiIds.set(id, name);
}

for (const [id, name] of wikiIds) {
  if (!GE_TAX_EXEMPT_IDS.has(id)) problems.push(`Exempt: ${name} (${id}) is on the Wiki but not in ge-tax.ts`);
}
for (const id of GE_TAX_EXEMPT_IDS) {
  if (!wikiIds.has(id)) {
    const name = items.find(item => item.id === id)?.name ?? 'unknown item';
    problems.push(`Exempt: ${name} (${id}) is in ge-tax.ts but not on the Wiki`);
  }
}

if (problems.length > 0) {
  console.error(`ge-tax.ts differs from the Wiki:\n${problems.map(problem => `- ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `ge-tax.ts matches the Wiki: ${GE_TAX_PERCENT}% tax, ${GE_TAX_CAP.toLocaleString('en')} cap, ${wikiIds.size} exempt items.`,
);
console.log('Also skim the rounding rules on the Wiki, then update the "last checked" date in ge-tax.ts.');
