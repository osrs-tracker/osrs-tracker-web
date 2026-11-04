import { type Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { accountType, rankLabel } from './player-labels';

const player = (changes: Partial<Player>): Player =>
  ({
    username: 'zezima',
    type: PlayerType.Normal,
    status: PlayerStatus.Default,
    diedAsHardcore: false,
    ...changes,
  }) as Player;

describe('accountType', () => {
  it('names each type and the statuses a player left', () => {
    expect(accountType(player({}))).toBe('Regular account');
    expect(accountType(player({ type: PlayerType.Ironman }))).toBe('Ironman');
    expect(accountType(player({ type: PlayerType.Hardcore }))).toBe('Hardcore ironman');
    expect(accountType(player({ type: PlayerType.Ultimate }))).toBe('Ultimate ironman');
    expect(accountType(player({ type: PlayerType.HardcoreMain }))).toBe('Hardcore main');
    expect(accountType(player({ type: PlayerType.Hardcore, diedAsHardcore: true }))).toBe('Ironman, formerly hardcore');
    expect(accountType(player({ type: PlayerType.Ironman, status: PlayerStatus.DeIroned }))).toBe('Former ironman');
  });

  // the API's hardcore ironman death check compares tables that don't apply to these characters
  it('names a Hardcore Worlds character as one, even when marked as a dead hardcore', () => {
    expect(accountType(player({ type: PlayerType.HardcoreMain, diedAsHardcore: true }))).toBe('Hardcore main');
  });
});

describe('rankLabel', () => {
  it("names a Hardcore Worlds character's ranks after its table", () => {
    expect(rankLabel(PlayerType.HardcoreMain)).toBe('Hardcore Worlds rank');
    expect(rankLabel(PlayerType.Ironman)).toBe('Rank');
    expect(rankLabel(undefined)).toBe('Rank');
  });
});
