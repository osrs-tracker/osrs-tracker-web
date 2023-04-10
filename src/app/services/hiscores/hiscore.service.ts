import { Injectable } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import {
  BossEnum,
  BountyHunterEnum,
  ClueScrollsEnum,
  CompetitiveEnum,
  MiniGameEnum,
  RaidEnum,
  SkillEnum,
} from './hiscore.enum';
import { Hiscore, MiniGame, Skill } from './hiscore.model';

import { ParseOrder, PO_2023_03_15 } from './hiscore.parse-order';

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

  parseHiscoreString(hiscoreString: string, date?: Date): Omit<Hiscore, keyof HiscoreEntry> {
    const parser = this.getCurrentParser(date);

    const lines = hiscoreString.split('\n').filter(line => line.length);

    const skillsInPO = parser.filter(val => Object.values(SkillEnum).includes(val as SkillEnum)).length;

    // skills are the first entries, after that come the minigames
    const skills = lines.slice(0, skillsInPO).map((line, i) => this.parseSkillLine(parser, line, i));
    const minigames = lines.slice(skillsInPO).map((line, i) => this.parseMiniGameLine(parser, line, i + skillsInPO));

    // Create a new hiscore object with skills and minigame placeholders
    const hiscore = {
      skills: skills.reduce((acc, val) => (acc = { ...acc, [val.name]: val }), {}),
      bosses: {},
      raids: {},
      clueScrolls: {},
      competitive: {},
      bountyHunter: {},
      miniGames: {},
    } as Hiscore;

    // Fill the minigame placeholders
    minigames.forEach(miniGame => {
      if (Object.values(BossEnum).includes(miniGame.name as BossEnum))
        return (hiscore.bosses[miniGame.name as BossEnum] = miniGame);

      if (Object.values(RaidEnum).includes(miniGame.name as RaidEnum))
        return (hiscore.raids[miniGame.name as RaidEnum] = miniGame);

      if (Object.values(ClueScrollsEnum).includes(miniGame.name as ClueScrollsEnum))
        return (hiscore.clueScrolls[miniGame.name as ClueScrollsEnum] = miniGame);

      if (Object.values(CompetitiveEnum).includes(miniGame.name as CompetitiveEnum))
        return (hiscore.competitive[miniGame.name as CompetitiveEnum] = miniGame);

      if (Object.values(BountyHunterEnum).includes(miniGame.name as BountyHunterEnum))
        return (hiscore.bountyHunter[miniGame.name as BountyHunterEnum] = miniGame);

      if (Object.values(MiniGameEnum).includes(miniGame.name as MiniGameEnum))
        return (hiscore.miniGames[miniGame.name as MiniGameEnum] = miniGame);

      // Will be logged if a new minigame is added to the hiscore page
      throw new Error(`Unknown minigame: "${miniGame.name}"`);
    });

    return hiscore;
  }

  /**
   * Returns the difference between two hiscores as a new Hiscore object.
   */
  hiscoreDiff(recent: Hiscore, old: Hiscore): Hiscore {
    const diffEntries = Object.entries(recent).map(([hiscoreKey, recentValue]) => {
      switch (hiscoreKey) {
        case 'date':
        case 'sourceString':
        case 'scrapingOffset':
          return [hiscoreKey, old[hiscoreKey]];
        case 'skills':
          return [
            hiscoreKey,
            Object.fromEntries(
              Object.entries<Skill>(recentValue).map(([skillName, skill]) => [
                skillName,
                {
                  name: skillName,
                  rank: skill.rank - old.skills[skillName as SkillEnum].rank,
                  level: skill.level - old.skills[skillName as SkillEnum].level,
                  xp: this.xpDiff(skill.xp, old.skills[skillName as SkillEnum].xp),
                },
              ]),
            ),
          ];
        case 'bosses':
        case 'raids':
        case 'clueScrolls':
        case 'competitive':
        case 'bountyHunter':
        case 'miniGames':
          return [
            hiscoreKey,
            Object.fromEntries(
              Object.entries<MiniGame>(recentValue).map(([miniGameName, miniGame]) => [
                miniGameName,
                {
                  name: miniGameName,
                  rank: miniGame.rank - (old[hiscoreKey] as { [key: string]: MiniGame })[miniGameName].rank,
                  score: miniGame.score - (old[hiscoreKey] as { [key: string]: MiniGame })[miniGameName].score,
                },
              ]),
            ),
          ];
        default:
          throw new Error('Unknown hiscore key: ' + hiscoreKey);
      }
    });

    return Object.fromEntries(diffEntries) as Hiscore;
  }

  getOverallXpDiff(today: HiscoreEntry, recent: HiscoreEntry): number {
    const todayOverall = this.getSkillFromSourceString(today.sourceString, SkillEnum.Overall);
    const recentOverall = this.getSkillFromSourceString(recent.sourceString, SkillEnum.Overall);

    return this.xpDiff(todayOverall.xp, recentOverall.xp);
  }

  private getSkillFromSourceString(sourceString: string, skill: SkillEnum, date?: Date): Skill {
    const parser = this.getCurrentParser(date);

    const lines = sourceString.split('\n').filter(line => line.length);
    const overallLineNo = parser.indexOf(skill);

    return this.parseSkillLine(parser, lines[overallLineNo], overallLineNo);
  }

  private getCurrentParser(date?: Date): ParseOrder {
    // todo: date will be used when we have more parsers
    return PO_2023_03_15;
  }

  /**
   *  For some reason for free to play people membership skills can have 0 or -1 exp in the hiscore API.
   *  Default to zero to fix ghost exp in membership skills (+1 exp).
   */
  private xpDiff(a: string | number, b: string | number): number {
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
