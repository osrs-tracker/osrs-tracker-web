import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { AccountTile } from './account-tile';

async function render(type: PlayerType, status: PlayerStatus, large = false): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(AccountTile);
  fixture.componentRef.setInput('account', {
    username: 'ToxSick',
    combatLevel: 3,
    type,
    status,
    diedAsHardcore: false,
    lastModified: new Date(),
    scrapingOffsets: [0],
  } satisfies Player);
  fixture.componentRef.setInput('large', large);
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('AccountTile', () => {
  it("draws the de-ironed badge's cross", async () => {
    const tile = await render(PlayerType.Ironman, PlayerStatus.DeIroned);

    // Without its component imported, `svg[lucideX]` stays an empty <svg> and Angular reports nothing
    const cross: SVGElement = tile.querySelector('svg[lucideX]')!;
    expect(cross.querySelector('path')).not.toBeNull();
  });

  it.each([false, true])('draws a person for a regular account (large: %s)', async large => {
    const tile = await render(PlayerType.Normal, PlayerStatus.Default, large);

    expect(tile.querySelector('svg[lucideUser] path')).not.toBeNull();
    expect(tile.querySelector('img')).toBeNull();
  });
});
