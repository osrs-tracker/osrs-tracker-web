import { accountType, capitalise } from '@app/common/format/player-labels';
import { type HiscoreEntry, type Player, PlayerStatus, PlayerType, SkillEnum } from '@osrs-tracker/models';
import hardcoreIcon from '../../../public/assets/icons/player_type/hardcore_ironman.png';
import ironmanIcon from '../../../public/assets/icons/player_type/ironman.png';
import ultimateIcon from '../../../public/assets/icons/player_type/ultimate.png';
import agility from '../../../public/assets/icons/skills/skill_icon_agility1.gif';
import attack from '../../../public/assets/icons/skills/skill_icon_attack1.gif';
import construction from '../../../public/assets/icons/skills/skill_icon_construction1.gif';
import cooking from '../../../public/assets/icons/skills/skill_icon_cooking1.gif';
import crafting from '../../../public/assets/icons/skills/skill_icon_crafting1.gif';
import defence from '../../../public/assets/icons/skills/skill_icon_defence1.gif';
import farming from '../../../public/assets/icons/skills/skill_icon_farming1.gif';
import firemaking from '../../../public/assets/icons/skills/skill_icon_firemaking1.gif';
import fishing from '../../../public/assets/icons/skills/skill_icon_fishing1.gif';
import fletching from '../../../public/assets/icons/skills/skill_icon_fletching1.gif';
import herblore from '../../../public/assets/icons/skills/skill_icon_herblore1.gif';
import hitpoints from '../../../public/assets/icons/skills/skill_icon_hitpoints1.gif';
import hunter from '../../../public/assets/icons/skills/skill_icon_hunter1.gif';
import magic from '../../../public/assets/icons/skills/skill_icon_magic1.gif';
import mining from '../../../public/assets/icons/skills/skill_icon_mining1.gif';
import overall from '../../../public/assets/icons/skills/skill_icon_overall1.gif';
import prayer from '../../../public/assets/icons/skills/skill_icon_prayer1.gif';
import ranged from '../../../public/assets/icons/skills/skill_icon_ranged1.gif';
import runecraft from '../../../public/assets/icons/skills/skill_icon_runecraft1.gif';
import sailing from '../../../public/assets/icons/skills/skill_icon_sailing1.gif';
import slayer from '../../../public/assets/icons/skills/skill_icon_slayer1.gif';
import smithing from '../../../public/assets/icons/skills/skill_icon_smithing1.gif';
import strength from '../../../public/assets/icons/skills/skill_icon_strength1.gif';
import thieving from '../../../public/assets/icons/skills/skill_icon_thieving1.gif';
import woodcutting from '../../../public/assets/icons/skills/skill_icon_woodcutting1.gif';
import skull from '../../../public/assets/icons/skull.png';
import { COLORS, el, frame, img, type Node, renderPng, tile } from './card-kit';

type GridSkill = Exclude<SkillEnum, SkillEnum.Overall>;

// The in-game stats tab, read row by row, as the page's skill grid (`hiscores/skill-grid.ts`)
const SKILL_ICONS: [GridSkill, Uint8Array][] = [
  ...[
    [SkillEnum.Attack, attack],
    [SkillEnum.Hitpoints, hitpoints],
    [SkillEnum.Mining, mining],
  ],
  ...[
    [SkillEnum.Strength, strength],
    [SkillEnum.Agility, agility],
    [SkillEnum.Smithing, smithing],
  ],
  ...[
    [SkillEnum.Defence, defence],
    [SkillEnum.Herblore, herblore],
    [SkillEnum.Fishing, fishing],
  ],
  ...[
    [SkillEnum.Ranged, ranged],
    [SkillEnum.Thieving, thieving],
    [SkillEnum.Cooking, cooking],
  ],
  ...[
    [SkillEnum.Prayer, prayer],
    [SkillEnum.Crafting, crafting],
    [SkillEnum.Firemaking, firemaking],
  ],
  ...[
    [SkillEnum.Magic, magic],
    [SkillEnum.Fletching, fletching],
    [SkillEnum.Woodcutting, woodcutting],
  ],
  ...[
    [SkillEnum.Runecraft, runecraft],
    [SkillEnum.Slayer, slayer],
    [SkillEnum.Farming, farming],
  ],
  ...[
    [SkillEnum.Construction, construction],
    [SkillEnum.Hunter, hunter],
    [SkillEnum.Sailing, sailing],
  ],
] as [GridSkill, Uint8Array][];

const HELMS: Record<PlayerType, Uint8Array> = {
  [PlayerType.Normal]: overall,
  [PlayerType.Ironman]: ironmanIcon,
  [PlayerType.Hardcore]: hardcoreIcon,
  [PlayerType.Ultimate]: ultimateIcon,
};

// The card's inner height (630 - 2 × 48 - 48 - 28 for the footer - 2 × 40): the grid fills it
const CONTENT_HEIGHT = 378;
const GRID_WIDTH = 384;
const MAX_LEVEL = 99;

/** "13 Oct 2026", in UTC like the player page */
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * The player's link preview image: a 1200×630 PNG card with their account type, name and combat level, and from their
 * latest hiscores the total level, total XP and the in-game skill grid, with 99s in gold. The footer dates the stats, as
 * chat apps keep a preview for weeks. Without hiscores, only who they are.
 */
export async function renderPlayerCard(player: Player, hiscore: HiscoreEntry | undefined): Promise<Uint8Array> {
  return renderPng(hiscore ? statsCard(player, hiscore) : identityCard(player));
}

function statsCard(player: Player, hiscore: HiscoreEntry): Node {
  const total = hiscore.skills[SkillEnum.Overall];
  const identity = el(
    { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    [
      el({ display: 'flex', flexDirection: 'column', gap: 24 }, [
        accountTile(player, 112),
        el({ display: 'flex', flexDirection: 'column', gap: 10 }, [
          name(player, player.username.length <= 10 ? 64 : 54),
          el(
            { fontSize: 26, lineHeight: '32px', color: COLORS.muted },
            `${accountType(player)}, combat ${player.combatLevel}`,
          ),
        ]),
      ]),
      ...(total
        ? [
            el({ display: 'flex', gap: 16 }, [
              tile('Total level', total.level.toLocaleString('en-US'), 200),
              tile('Total XP', COMPACT.format(total.xp), 200),
            ]),
          ]
        : []),
    ],
  );
  return frame(
    [el({ display: 'flex', gap: 40, height: CONTENT_HEIGHT }, [identity, skillGrid(hiscore)])],
    `stats on ${DAY.format(new Date(hiscore.date))}`,
  );
}

/** The item card's layout: the account tile beside the name, the combat level under them */
function identityCard(player: Player): Node {
  return frame(
    [
      el({ display: 'flex', alignItems: 'center', gap: 36 }, [
        accountTile(player, 224),
        el({ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }, [
          name(player, 80),
          el({ fontSize: 28, lineHeight: '34px', color: COLORS.muted }, accountType(player)),
        ]),
      ]),
      el({ display: 'flex' }, [tile('Combat level', String(player.combatLevel), 304)]),
    ],
    'XP tracker',
  );
}

function name(player: Player, fontSize: number): Node {
  return el({ fontSize, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1 }, capitalise(player.username));
}

/** Rows of three like the stats tab, each level beside its icon */
function skillGrid(hiscore: HiscoreEntry): Node {
  const rows: Node[] = [];
  for (let i = 0; i < SKILL_ICONS.length; i += 3) {
    rows.push(
      el(
        { flex: 1, display: 'flex', gap: 6 },
        SKILL_ICONS.slice(i, i + 3).map(([skill, icon]) => skillCell(hiscore, skill, icon)),
      ),
    );
  }
  return el(
    {
      width: GRID_WIDTH,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: 10,
      borderRadius: 20,
      backgroundColor: COLORS.deep,
    },
    rows,
  );
}

function skillCell(hiscore: HiscoreEntry, skill: GridSkill, icon: Uint8Array): Node {
  // An untrained skill (`null`) is level 1, as on the page
  const level = hiscore.skills[skill]?.level ?? 1;
  return el(
    {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 12px',
      borderRadius: 12,
      backgroundColor: COLORS.tile,
    },
    [
      // Twice the 16px icons' size, so each pixel stays square; Ranged's 18px one is a little larger
      el({ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }, [
        img(icon, iconSize(icon) * 2),
      ]),
      el(
        {
          fontSize: 22,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          color: level >= MAX_LEVEL ? COLORS.gold : COLORS.text,
        },
        String(level),
      ),
    ],
  );
}

/**
 * The account type's helm (the Overall icon for a regular account) on a tile, as on the page: bottom left a red × when
 * de-ironed or the ironman helm when de-ultimated, bottom right a skull when a hardcore died
 */
function accountTile(player: Player, size: number): Node {
  const badge = (side: 'left' | 'right', child: Node) =>
    el(
      {
        position: 'absolute',
        [side]: -10,
        bottom: -10,
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        border: `2px solid ${COLORS.line}`,
        backgroundColor: COLORS.deep,
      },
      [child],
    );
  return el(
    {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: size / 4.5,
      border: `2px solid ${COLORS.line}`,
      backgroundColor: COLORS.deep,
    },
    [
      // As the page's 40px helm in its 64px tile
      img(HELMS[player.type], Math.round(size * 0.625)),
      ...(player.status === PlayerStatus.DeIroned ? [badge('left', cross())] : []),
      ...(player.status === PlayerStatus.DeUltimated ? [badge('left', img(ironmanIcon, 28))] : []),
      ...(player.diedAsHardcore ? [badge('right', img(skull, 28))] : []),
    ],
  );
}

/** The page's de-ironed ×, in the dark theme's `down` red */
function cross(): Node {
  const bar = (angle: number) =>
    el({
      position: 'absolute',
      width: 22,
      height: 5,
      borderRadius: 3,
      backgroundColor: '#fd8072',
      transform: `rotate(${angle}deg)`,
    });
  return el(
    { position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    [bar(45), bar(-45)],
  );
}

/** A GIF's width from its header: 16 for every skill icon but Ranged's 18 */
function iconSize(gif: Uint8Array): number {
  return gif[6] | (gif[7] << 8);
}
