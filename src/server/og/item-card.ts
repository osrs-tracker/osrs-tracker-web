import type { Item } from '@osrs-tracker/models';
import hardcoreWorldsIcon from '../../../public/assets/icons/player_type/hardcore_mains.png';
import { COLORS, el, frame, img, type Node, renderPng, tile } from './card-kit';

/** As the app's `PriceWorld`, which the server can't import */
export type CardWorld = 'main' | 'hardcore';

const ICON_TILE = 224;
const ICON_MAX = 176;
// A third of the card's inner width (1200 - 2 × 64 - 2 × 40) less the gaps: tiles keep it when one is left out
const TILE_WIDTH = (992 - 2 * 20) / 3;

export async function renderItemCard(
  item: Item,
  iconPng: Uint8Array | undefined,
  world: CardWorld = 'main',
): Promise<Uint8Array> {
  return renderPng(card(item, iconPng, world));
}

function card(item: Item, iconPng: Uint8Array | undefined, world: CardWorld): Node {
  const hardcore = world === 'hardcore';
  const tiles = [
    factTile('Buy limit', item.limit, ''),
    factTile('High alch', item.highalch, ' gp'),
    factTile('Low alch', item.lowalch, ' gp'),
  ].filter((t): t is Node => t !== undefined);

  return frame(
    [header(item, iconPng, hardcore), ...(tiles.length ? [el({ display: 'flex', gap: 20 }, tiles)] : [])],
    hardcore ? 'Hardcore Worlds Grand Exchange price' : 'Grand Exchange price',
  );
}

function header(item: Item, iconPng: Uint8Array | undefined, hardcore: boolean): Node {
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
    // Clamped to two lines each, which fit the 224px row at every name size, so the card never grows. The Hardcore
    // Worlds badge takes one of the examine text's lines
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
      ...(hardcore ? [hardcoreBadge()] : []),
      ...(item.examine
        ? [
            el(
              { display: 'block', lineClamp: hardcore ? 1 : 2, fontSize: 24, lineHeight: '30px', color: COLORS.muted },
              item.examine,
            ),
          ]
        : []),
    ]),
  ]);
}

/** The item page's badge: an amber-outlined pill with the Hardcore Worlds icon */
function hardcoreBadge(): Node {
  return el(
    {
      alignSelf: 'flex-start',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 40,
      padding: '0 16px',
      borderRadius: 20,
      border: `2px solid ${COLORS.gold}`,
      backgroundColor: COLORS.deep,
      fontSize: 22,
      lineHeight: '28px',
      fontWeight: 600,
    },
    [img(hardcoreWorldsIcon, 24), 'Hardcore Worlds'],
  );
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

function pngSize(png: Uint8Array): { width: number; height: number } | undefined {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 24 || signature.some((byte, i) => png[i] !== byte)) return undefined;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width && height ? { width, height } : undefined;
}
