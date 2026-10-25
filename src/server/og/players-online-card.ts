import type { PlayerCountPoint } from '@osrs-tracker/models';
import { COLORS, el, frame, type Node, renderPng } from './card-kit';

// The count's column fits six digits at 120px; the line takes the rest of the card's inner width (992px) after the gap.
// Both columns are a 32px label over a 120px body, 16px apart, so their labels and bottoms line up.
const COUNT_WIDTH = 480;
const LINE_WIDTH = 992 - COUNT_WIDTH - 40;
const LINE_HEIGHT = 120;
const TILE_WIDTH = (992 - 2 * 20) / 3;
const DAY_MS = 24 * 60 * 60 * 1000;
// "13 Oct 2026, 19:15 UTC": chat apps keep a preview for weeks, so the footer says when the count was taken
const TAKEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
// The card kit's `tile`, which sets its values in tabular digits
const TILE_STYLE = {
  width: TILE_WIDTH,
  display: 'flex',
  flexDirection: 'column',
  padding: '22px 24px',
  borderRadius: 20,
  backgroundColor: COLORS.tile,
};

/** @param samples The last 24 hours, oldest first; at least two */
export async function renderPlayersOnlineCard(samples: PlayerCountPoint[]): Promise<Uint8Array> {
  return renderPng(card(samples));
}

function card(samples: PlayerCountPoint[]): Node {
  const latest = samples.at(-1)!;
  const totals = samples.map(sample => sample.total);

  return frame(
    [
      el({ display: 'flex', gap: 40 }, [
        el({ width: COUNT_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }, [
          liveLabel(),
          // Proportional digits: a tabular 1 sits in a wide box and would start the number right of the dot above it
          el({ fontSize: 120, lineHeight: '120px', fontWeight: 600, letterSpacing: -2 }, format(latest.total)),
        ]),
        el({ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }, [
          el({ display: 'flex', alignItems: 'center', height: 32, fontSize: 22, color: COLORS.muted }, 'Last 24 hours'),
          line(samples),
        ]),
      ]),
      el({ display: 'flex', gap: 20 }, [
        splitTile(latest.members, latest.f2p),
        valueTile('24-hour peak', format(Math.max(...totals))),
        valueTile('24-hour low', format(Math.min(...totals))),
      ]),
    ],
    `players online on ${TAKEN.format(latest.date)} UTC`,
  );
}

/** A label over a value, as tall as the split tile beside it (28 + 40 + 12 + 8px) */
function valueTile(label: string, value: string): Node {
  return el(TILE_STYLE, [
    el({ fontSize: 22, lineHeight: '28px', color: COLORS.muted }, label),
    // Proportional digits, so a leading 1 lines up with the label
    el({ fontSize: 50, lineHeight: '60px', fontWeight: 600 }, value),
  ]);
}

function splitTile(members: number, f2p: number): Node {
  const players = members + f2p;
  const side = (label: string, value: string, align: string) =>
    el({ display: 'flex', flexDirection: 'column', alignItems: align }, [
      el({ fontSize: 22, lineHeight: '28px', color: COLORS.muted }, label),
      el({ fontSize: 34, lineHeight: '40px', fontWeight: 600 }, value),
    ]);
  return el({ ...TILE_STYLE, gap: 12 }, [
    el({ display: 'flex', justifyContent: 'space-between' }, [
      side('Members', share(members, players), 'flex-start'),
      side('Free-to-play', share(f2p, players), 'flex-end'),
    ]),
    el({ display: 'flex', gap: 3, height: 8 }, [
      el({ width: `${players ? (members / players) * 100 : 0}%`, borderRadius: 8, backgroundColor: COLORS.accent }),
      el({ flex: 1, borderRadius: 8, backgroundColor: COLORS.faint }),
    ]),
  ]);
}

function liveLabel(): Node {
  return el({ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, lineHeight: '32px', fontWeight: 600 }, [
    el({ width: 14, height: 14, borderRadius: 14, backgroundColor: COLORS.accent }),
    'Online now',
  ]);
}

/**
 * Placed by time over the 24 hours up to the newest sample, so a gap stays a gap and a shorter history starts partway
 */
function line(samples: PlayerCountPoint[]): Node {
  const totals = samples.map(sample => sample.total);
  const min = Math.min(...totals);
  const range = Math.max(...totals) - min || 1;
  const end = samples.at(-1)!.date.getTime();
  // Room for the dot at the top, bottom and right, and for the stroke's round cap at the left
  const pad = 9;
  const left = 3;
  const points = samples.map(sample => [
    left + Math.max(0, 1 - (end - sample.date.getTime()) / DAY_MS) * (LINE_WIDTH - pad - left),
    pad + (1 - (sample.total - min) / range) * (LINE_HEIGHT - 2 * pad),
  ]);
  const path = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points.at(-1)!;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LINE_WIDTH}" height="${LINE_HEIGHT}">` +
    '<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">' +
    `<stop offset="0" stop-color="${COLORS.accent}" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="${COLORS.accent}" stop-opacity="0"/></linearGradient></defs>` +
    `<path d="${path} L${lastX.toFixed(1)} ${LINE_HEIGHT} L${points[0][0].toFixed(1)} ${LINE_HEIGHT} Z" fill="url(#fade)"/>` +
    `<path d="${path}" fill="none" stroke="${COLORS.accent}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="9" fill="${COLORS.accent}"/></svg>`;
  // An SVG image: satori draws an `img`'s data URI as is, so the line keeps its own coordinates
  return {
    type: 'img',
    props: { src: `data:image/svg+xml;base64,${btoa(svg)}`, width: LINE_WIDTH, height: LINE_HEIGHT },
  };
}

function format(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** A whole percentage, as on the page (`formatShare` in `world-locations.ts`) */
function share(part: number, total: number): string {
  const percent = total ? (part / total) * 100 : 0;
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`;
}
