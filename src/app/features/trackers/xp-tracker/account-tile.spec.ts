import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { AccountTile } from './account-tile';

describe('AccountTile', () => {
  it("draws the de-ironed badge's cross", async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(AccountTile);
    fixture.componentRef.setInput('account', {
      username: 'ToxSick',
      combatLevel: 3,
      type: PlayerType.Ironman,
      status: PlayerStatus.DeIroned,
      diedAsHardcore: false,
      lastModified: new Date(),
      scrapingOffsets: [0],
    } satisfies Player);
    await fixture.whenStable();

    // Without its component imported, `svg[lucideX]` stays an empty <svg> and Angular reports nothing
    const cross: SVGElement = fixture.nativeElement.querySelector('svg[lucideX]');
    expect(cross.querySelector('path')).not.toBeNull();
  });
});
