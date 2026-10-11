import type { Item } from '@osrs-tracker/models';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori, { type Font } from 'satori';
import regular from './fonts/SOLIX-Regular.ttf';
import semiBoldTabular from './fonts/SOLIX-SemiBold-Tabular.ttf';
import semiBold from './fonts/SOLIX-SemiBold.ttf';

/** A satori element: plain `{ type, props }` objects, as there is no React */
interface Node {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: Child | Child[];
    src?: string;
    width?: number;
    height?: number;
  };
}
type Child = Node | string;

const WIDTH = 1200;
const HEIGHT = 630;
const ICON_TILE = 224;
const ICON_MAX = 176;
// A third of the card's inner width (1200 - 2 × 64 - 2 × 40) less the gaps: tiles keep it when one is left out
const TILE_WIDTH = (992 - 2 * 20) / 3;

// Static instances without kerning, which satori 0.32 draws but doesn't lay out, and a copy whose digits are its
// tabular ones, as satori can't turn on OpenType features (`docs/decisions.md`)
const fonts: Font[] = [
  { name: 'SOLIX', data: arrayBuffer(regular), weight: 400, style: 'normal' },
  { name: 'SOLIX', data: arrayBuffer(semiBold), weight: 600, style: 'normal' },
  { name: 'SOLIX Tabular', data: arrayBuffer(semiBoldTabular), weight: 600, style: 'normal' },
];

let wasmReady: Promise<void> | undefined;

/**
 * The item's link preview image: a 1200×630 PNG card with its icon, name, examine text, buy limit and alch values.
 * @param iconPng The Wiki icon's PNG bytes, or `undefined` when it failed to load: the card then shows an empty tile.
 */
export async function renderItemCard(item: Item, iconPng: Uint8Array | undefined): Promise<Uint8Array> {
  // Shared by concurrent first calls; a failed init is retried on the next call
  wasmReady ??= initWasm(resvgWasm).catch((error: unknown) => {
    wasmReady = undefined;
    throw error;
  });

  const svg = await satori(card(item, iconPng), { width: WIDTH, height: HEIGHT, fonts });
  await wasmReady;
  // optimizeSpeed scales raster images nearest-neighbour, which keeps the upscaled icon's pixels sharp
  const resvg = new Resvg(svg, { imageRendering: 1, font: { loadSystemFonts: false } });
  try {
    const image = resvg.render();
    try {
      return image.asPng();
    } finally {
      image.free();
    }
  } finally {
    resvg.free();
  }
}

function card(item: Item, iconPng: Uint8Array | undefined): Node {
  const tiles = [
    tile('Buy limit', item.limit, ''),
    tile('High alch', item.highalch, ' gp'),
    tile('Low alch', item.lowalch, ' gp'),
  ].filter((t): t is Node => t !== undefined);

  return el(
    {
      width: WIDTH,
      height: HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      // 48px above the card, between it and the footer, and below the footer: the card takes up the rest
      padding: '48px 64px',
      gap: 48,
      backgroundColor: '#0b1120',
      // An explicit radius: satori scales px colour stops by the element's size instead of the gradient's
      backgroundImage: 'radial-gradient(circle 1px at 14px 14px, #26324a 100%, transparent 100%)',
      backgroundSize: '28px 28px',
      backgroundPosition: '14px 14px',
      fontFamily: 'SOLIX',
      color: '#ffffff',
    },
    [
      el(
        {
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 36,
          padding: 40,
          borderRadius: 32,
          backgroundColor: '#1e293b',
        },
        [header(item, iconPng), ...(tiles.length ? [el({ display: 'flex', gap: 20 }, tiles)] : [])],
      ),
      footer(),
    ],
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
        backgroundColor: '#0f172a',
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
        ? [el({ display: 'block', lineClamp: 2, fontSize: 24, lineHeight: '30px', color: '#94a3b8' }, item.examine)]
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
  return [
    {
      type: 'img',
      props: {
        src: `data:image/png;base64,${base64(png)}`,
        width: size.width * scale,
        height: size.height * scale,
      },
    },
  ];
}

function tile(label: string, value: number | undefined, unit: string): Node | undefined {
  if (!value) return undefined;
  return el(
    {
      width: TILE_WIDTH,
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 24px',
      borderRadius: 20,
      backgroundColor: '#263349',
    },
    [
      el({ fontSize: 22, lineHeight: '28px', color: '#94a3b8' }, label),
      el(
        { fontFamily: 'SOLIX Tabular', fontSize: 34, lineHeight: '40px', fontWeight: 600 },
        Math.round(value).toLocaleString('en-US') + unit,
      ),
    ],
  );
}

function footer(): Node {
  return el({ display: 'flex', justifyContent: 'space-between', fontSize: 24, lineHeight: '28px' }, [
    el({ display: 'flex' }, [
      el({ fontWeight: 600, whiteSpace: 'pre' }, 'OSRS '),
      el({ fontWeight: 600, color: '#34d399' }, 'Tracker'),
      el({ color: '#94a3b8', whiteSpace: 'pre' }, ', Grand Exchange price'),
    ]),
    el({ color: '#64748b' }, 'osrs-tracker.freekmencke.com'),
  ]);
}

function el(style: Record<string, string | number>, children: Child | Child[]): Node {
  return { type: 'div', props: { style, children } };
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

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** satori wants an `ArrayBuffer`; the loader's bytes may be a view into a larger one */
function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}
