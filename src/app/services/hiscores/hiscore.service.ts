import { Injectable } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import partition from 'lodash-es/partition';
import {
  BossEnum,
  Hiscore,
  MiniGame,
  MiniGameEnum,
  ParseOrder,
  PO_2023_03_15,
  RaidEnum,
  Skill,
  SkillEnum,
} from './hiscore.model';

@Injectable({
  providedIn: 'root',
})
export class HiscoreService {
  parseHiscores(hiscoreEntries: HiscoreEntry[]): Hiscore[] {
    return hiscoreEntries.map(
      hiscoreEntry =>
        ({
          ...hiscoreEntry,
          ...this.parseHiscoreString(hiscoreEntry.sourceString),
        } as Hiscore),
    );
  }

  parseHiscoreString(hiscoreString: string): Omit<Hiscore, keyof HiscoreEntry> {
    const lines = hiscoreString.split('\n').filter(line => line.length);

    const skills = lines.slice(0, 24).map((line, i) => this.parseSkillLine(PO_2023_03_15, line, i));
    const leaguePoints = lines.slice(24, 25).map((line, i) => this.parseMiniGameLine(PO_2023_03_15, line, 24 + i))[0];
    const bountyHunter = lines.slice(25, 27).map((line, i) => this.parseMiniGameLine(PO_2023_03_15, line, 25 + i));
    const clueScrolls = lines.slice(27, 35).map((line, i) => this.parseMiniGameLine(PO_2023_03_15, line, 27 + i));
    const miniGames = lines.slice(34, 38).map((line, i) => this.parseMiniGameLine(PO_2023_03_15, line, 34 + i));
    const bossesAndRaids = lines.slice(38).map((line, i) => this.parseMiniGameLine(PO_2023_03_15, line, 38 + i));

    const [bosses, raids] = partition(bossesAndRaids, val => Object.values(BossEnum).includes(val.name as BossEnum));

    return {
      skills,
      leaguePoints,
      bountyHunter,
      clueScrolls,
      miniGames,
      bosses,
      raids,
    };
  }

  hiscoreDiff(first: Hiscore, last: Hiscore): Hiscore {
    type HiscoreEntries = [string, Skill[] | MiniGame | MiniGame[]][];

    const firstHiscore: HiscoreEntries = Object.entries(first).sort((a, b) => a[0].localeCompare(b[0]));
    const lastHiscore: HiscoreEntries = Object.entries(last).sort((a, b) => a[0].localeCompare(b[0]));

    const diffEntries: HiscoreEntries = firstHiscore.map(([key, firstValue], index) => {
      // use the date from the last hiscore
      if (key === 'date') return [key, lastHiscore[index][1]];
      // exclude these keys from diff
      if (['sourceString', 'scrapingOffset'].includes(key)) return [key, firstValue];

      if (Array.isArray(firstValue)) {
        if (Object.hasOwn(firstValue[0], 'xp')) {
          const lastValue = lastHiscore[index][1] as Skill[];

          const skillDiffs = (firstValue as Skill[]).map(
            (skill, i) =>
              ({
                name: skill.name,
                rank: skill.rank - lastValue[i].rank,
                level: skill.level - lastValue[i].level,
                xp: this.expDiff(skill.xp, lastValue[i].xp),
              } as Skill),
          );

          return [key, skillDiffs] as [string, Skill[]];
        } else {
          const lastValue = lastHiscore[index][1] as MiniGame[];

          const MiniGameDiffs = (firstValue as MiniGame[]).map(
            (miniGame, i) =>
              ({
                name: miniGame.name,
                rank: miniGame.rank - lastValue[i].rank,
                score: miniGame.score - lastValue[i].score,
              } as MiniGame),
          );

          return [key, MiniGameDiffs] as [string, MiniGame[]];
        }
      } else {
        const lastValue = lastHiscore[index][1] as MiniGame;

        const miniGameDiff = {
          name: key,
          rank: firstValue.rank - lastValue.rank,
          score: firstValue.score - lastValue.score,
        };

        return [key, miniGameDiff] as [string, MiniGame];
      }
    });

    return Object.fromEntries(diffEntries) as Hiscore;
  }

  private expDiff(a: string | number, b: string | number): number {
    // For some reason for free to play people membership skills can have 0 or -1 exp in the hiscore API.
    // Default to zero to fix ghost exp in membership skills (+1 exp).
    return Math.max(Number(a), 0) - Math.max(Number(b), 0);
  }

  private parseSkillLine(parseOrder: ParseOrder, line: string, lineNo: number): Skill {
    const [rank, level, xp] = line.split(',');

    return {
      name: parseOrder[lineNo] as SkillEnum,
      rank: parseInt(rank),
      level: parseInt(level),
      xp: parseInt(xp),
    };
  }

  private parseMiniGameLine(parseOrder: ParseOrder, line: string, lineNo: number): MiniGame {
    const [rank, score] = line.split(',');

    return {
      name: parseOrder[lineNo] as MiniGameEnum | RaidEnum | BossEnum,
      rank: parseInt(rank),
      score: parseInt(score),
    };
  }
}
