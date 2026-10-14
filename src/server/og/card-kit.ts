import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori, { type Font } from 'satori';
import regular from './fonts/SOLIX-Regular.ttf';
import semiBoldTabular from './fonts/SOLIX-SemiBold-Tabular.ttf';
import semiBold from './fonts/SOLIX-SemiBold.ttf';

/** A satori element: plain `{ type, props }` objects, as there is no React */
export interface Node {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: Child | Child[];
    src?: string;
    width?: number;
    height?: number;
  };
}
export type Child = Node | string;

const WIDTH = 1200;
const HEIGHT = 630;

/** The site's dark theme */
export const COLORS = {
  ground: '#0b1120',
  dot: '#26324a',
  card: '#1e293b',
  tile: '#263349',
  deep: '#0f172a',
  line: '#334155',
  muted: '#94a3b8',
  faint: '#64748b',
  accent: '#34d399',
  gold: '#fbbf24',
  text: '#ffffff',
};

// Static instances without kerning, which satori 0.32 draws but doesn't lay out, and a copy whose digits are its
// tabular ones, as satori can't turn on OpenType features (`docs/decisions.md`)
const fonts: Font[] = [
  { name: 'SOLIX', data: arrayBuffer(regular), weight: 400, style: 'normal' },
  { name: 'SOLIX', data: arrayBuffer(semiBold), weight: 600, style: 'normal' },
  { name: 'SOLIX Tabular', data: arrayBuffer(semiBoldTabular), weight: 600, style: 'normal' },
];

let wasmReady: Promise<void> | undefined;

/** Lays the card out with satori and draws it as a 1200×630 PNG */
export async function renderPng(card: Node): Promise<Uint8Array> {
  // Shared by concurrent first calls; a failed init is retried on the next call
  wasmReady ??= initWasm(resvgWasm).catch((error: unknown) => {
    wasmReady = undefined;
    throw error;
  });

  const svg = await satori(card, { width: WIDTH, height: HEIGHT, fonts });
  await wasmReady;
  // optimizeSpeed scales raster images nearest-neighbour, which keeps upscaled pixel art sharp
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

/**
 * The dotted ground with one card on it and the footer under it, shared by every link preview
 * @param footerText What follows "OSRS Tracker, " in the footer
 */
export function frame(content: Child[], footerText: string): Node {
  return el(
    {
      width: WIDTH,
      height: HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      // 48px above the card, between it and the footer, and below the footer: the card takes up the rest
      padding: '48px 64px',
      gap: 48,
      backgroundColor: COLORS.ground,
      // An explicit radius: satori scales px colour stops by the element's size instead of the gradient's
      backgroundImage: `radial-gradient(circle 1px at 14px 14px, ${COLORS.dot} 100%, transparent 100%)`,
      backgroundSize: '28px 28px',
      backgroundPosition: '14px 14px',
      fontFamily: 'SOLIX',
      color: COLORS.text,
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
          backgroundColor: COLORS.card,
        },
        content,
      ),
      footer(footerText),
    ],
  );
}

function footer(text: string): Node {
  return el({ display: 'flex', justifyContent: 'space-between', fontSize: 24, lineHeight: '28px' }, [
    el({ display: 'flex' }, [
      el({ fontWeight: 600, whiteSpace: 'pre' }, 'OSRS '),
      el({ fontWeight: 600, color: COLORS.accent }, 'Tracker'),
      el({ color: COLORS.muted, whiteSpace: 'pre' }, `, ${text}`),
    ]),
    el({ color: COLORS.faint }, 'osrs-tracker.freekmencke.com'),
  ]);
}

/** A stat tile: a label over a tabular value */
export function tile(label: string, value: string, width: number): Node {
  return el(
    {
      width,
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 24px',
      borderRadius: 20,
      backgroundColor: COLORS.tile,
    },
    [
      el({ fontSize: 22, lineHeight: '28px', color: COLORS.muted }, label),
      el({ fontFamily: 'SOLIX Tabular', fontSize: 34, lineHeight: '40px', fontWeight: 600 }, value),
    ],
  );
}

/** A div; one without children gets none, as satori 0.32 asks an empty array for `display: flex` */
export function el(style: Record<string, string | number>, children?: Child | Child[]): Node {
  return { type: 'div', props: children === undefined ? { style } : { style, children } };
}

/** An image of the given size from PNG or GIF bytes */
export function img(bytes: Uint8Array, width: number, height = width): Node {
  // Both start with their own signature, which is all the data URI's type needs to name
  const type = bytes[0] === 0x47 ? 'image/gif' : 'image/png';
  return { type: 'img', props: { src: `data:${type};base64,${base64(bytes)}`, width, height } };
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
