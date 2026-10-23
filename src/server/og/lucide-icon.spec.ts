// @vitest-environment node
import { LucideUser } from '@lucide/angular';
import { describe, expect, it } from 'vitest';
import { lucideIcon } from './lucide-icon';

describe('lucideIcon', () => {
  it("draws a Lucide icon's shapes as an SVG image, without Lucide's keys", () => {
    const { type, props } = lucideIcon(LucideUser.icon, 36, '#ffffff') as {
      type: string;
      props: { src: string; width: number; height: number };
    };
    const svg = atob(props.src.replace('data:image/svg+xml;base64,', ''));

    expect({ type, width: props.width, height: props.height }).toEqual({ type: 'img', width: 36, height: 36 });
    expect(svg).toContain('stroke="#ffffff" stroke-width="2"');
    expect(svg).toContain(
      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    );
    expect(svg).not.toContain('key=');
  });
});
