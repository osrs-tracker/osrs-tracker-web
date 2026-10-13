import type { Item } from '@osrs-tracker/models';
import { COLORS, el, frame, img, type Node, renderPng, tile } from './card-kit';

const ICON_TILE = 224;
const ICON_MAX = 176;
// A third of the card's inner width (1200 - 2 × 64 - 2 × 40) less the gaps: tiles keep it when one is left out
const TILE_WIDTH = (992 - 2 * 20) / 3;

/**
 * The item's link preview image: a 1200×630 PNG card with its icon, name, examine text, buy limit and alch values.
 * @param iconPng The Wiki icon's PNG bytes, or `undefined` when it failed to load: the card then shows an empty tile.
 */
export async function renderItemCard(item: Item, iconPng: Uint8Array | undefined): Promise<Uint8Array> {
  return renderPng(card(item, iconPng));
}

function card(item: Item, iconPng: Uint8Array | undefined): Node {
  const tiles = [
    factTile('Buy limit', item.limit, ''),
    factTile('High alch', item.highalch, ' gp'),
    factTile('Low alch', item.lowalch, ' gp'),
  ].filter((t): t is Node => t !== undefined);

  return frame(
    [header(item, iconPng), ...(tiles.length ? [el({ display: 'flex', gap: 20 }, tiles)] : [])],
    'Grand Exchange price',
  );
}

function header(item: Item, iconPng: Uint8Array | undefined): Node {
  const nameSize = item.name.length <= 14 ? 72 : item.name.length <= 22 ? 60 : 52;
  return el({ display: 'flex', alignItems: 'center', gap: 36, height: ICON_TILE }, [
    el(
      {
        width: ICON_TILE,
        height: ICON_TILE,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        backgroundColor: COLORS.deep,
      },
      icon(iconPng),
    ),
    // Clamped to two lines each, which fit the 224px row at every name size, so the card never grows
    el({ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }, [
      el(
        {
          display: 'block',
          lineClamp: 2,
          fontSize: nameSize,
          fontWeight: 600,
          lineHeight: 1.05,
          letterSpacing: -1,
        },
        item.name,
      ),
      ...(item.examine
        ? [el({ display: 'block', lineClamp: 2, fontSize: 24, lineHeight: '30px', color: COLORS.muted }, item.examine)]
        : []),
    ]),
  ]);
}

/** The icon upscaled by a whole factor, so each of its pixels becomes an equal square */
function icon(png: Uint8Array | undefined): Node[] {
  const size = png && pngSize(png);
  if (!png || !size) return [];
  const longest = Math.max(size.width, size.height);
  // An icon larger than the space (none so far) is scaled down to fit instead
  const scale = Math.floor(ICON_MAX / longest) || ICON_MAX / longest;
  return [img(png, size.width * scale, size.height * scale)];
}

function factTile(label: string, value: number | undefined, unit: string): Node | undefined {
  return value ? tile(label, Math.round(value).toLocaleString('en-US') + unit, TILE_WIDTH) : undefined;
}

/** Width and height from the PNG's IHDR chunk, or `undefined` if the bytes aren't a PNG */
function pngSize(png: Uint8Array): { width: number; height: number } | undefined {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 24 || signature.some((byte, i) => png[i] !== byte)) return undefined;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width && height ? { width, height } : undefined;
}
