import type { LucideIconData, LucideIconNode } from '@lucide/angular';
import type { Node } from './card-kit';

// Apart from `card-kit.ts`, which loads resvg's wasm on import, so a spec can test it

export function lucideIcon({ node }: LucideIconData, size: number, color: string): Node {
  const markup = (nodes: LucideIconNode[]): string =>
    nodes
      .map(([tag, attributes, children = []]) => {
        // `key` is Lucide's own, for frameworks' lists
        const attrs = Object.entries(attributes)
          .filter(([name]) => name !== 'key')
          .map(([name, value]) => ` ${name}="${String(value)}"`);
        return `<${tag}${attrs.join('')}>${markup(children)}</${tag}>`;
      })
      .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${markup(node)}</svg>`;
  return { type: 'img', props: { src: `data:image/svg+xml;base64,${btoa(svg)}`, width: size, height: size } };
}
