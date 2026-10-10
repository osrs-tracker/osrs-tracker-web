import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@app/common/icon/icon';

interface PreviewSkill {
  name: string;
  level: number;
  /** Progress to the next level in %, for skills below 99 */
  progress: number;
}

const SKILLS: PreviewSkill[] = [
  { name: 'Attack', level: 99, progress: 0 },
  { name: 'Hitpoints', level: 99, progress: 0 },
  { name: 'Agility', level: 96, progress: 55 },
  { name: 'Ranged', level: 99, progress: 0 },
  { name: 'Prayer', level: 99, progress: 0 },
  { name: 'Magic', level: 99, progress: 0 },
  { name: 'Runecraft', level: 95, progress: 71 },
  { name: 'Slayer', level: 99, progress: 0 },
  { name: 'Farming', level: 98, progress: 18 },
  { name: 'Construction', level: 97, progress: 40 },
  { name: 'Hunter', level: 99, progress: 0 },
  { name: 'Sailing', level: 84, progress: 62 },
];

/** Cumulative overall XP (in thousands) per day of the sample week */
const CUMULATIVE_XP = [530, 1110, 1405, 2115, 2665, 3202, 3722];
const LINE = CUMULATIVE_XP.map((xp, day) => `L${day * 50} ${Math.round(62 - (xp / 3722) * 58)}`).join(' ');

/**
 * Home's tilted illustration of a player page, with static sample data (no API calls). Decorative apart from its link
 * to the XP Tracker.
 */
@Component({
  selector: 'preview-card',
  template: `
    <a
      class="block rounded-3xl bg-card border border-line shadow-float overflow-hidden rotate-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      routerLink="/trackers/xp"
      aria-label="Open the XP Tracker (example player stats)"
    >
      <div class="flex items-center gap-3 p-4 border-b border-line" aria-hidden="true">
        <span class="flex items-center justify-center size-10 shrink-0 rounded-xl bg-deep border border-line">
          <svg
            class="size-5.5 stroke-text"
            viewBox="0 0 24 24"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
        </span>
        <span class="flex flex-1 flex-col">
          <span class="text-lg font-bold text-strong">Zezima</span>
          <span class="text-sm text-muted">Total level 2,316</span>
        </span>
        <span class="flex flex-col items-end">
          <span class="font-bold text-strong tabular-nums">+3.72M XP</span>
          <span class="text-sm text-muted">this week</span>
        </span>
      </div>

      <div class="px-4 pt-4" aria-hidden="true">
        <div class="grid grid-cols-3 gap-px rounded-xl bg-line border border-line overflow-hidden">
          @for (skill of SKILLS; track skill.name) {
            <div class="flex flex-col justify-between bg-inner">
              <div class="flex items-center justify-between px-3 pt-1.75 pb-1.5">
                <img class="size-6" icon [name]="skill.name" [skill]="true" />
                <span class="font-bold text-strong tabular-nums">{{ skill.level }}</span>
              </div>
              <div class="h-0.75 bg-line">
                @if (skill.level < 99) {
                  <div class="h-full bg-accent-hover" [style.width.%]="skill.progress"></div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div class="flex flex-col gap-2 p-4" aria-hidden="true">
        <span class="text-sm text-muted">Total XP gained, last 7 days</span>
        <svg class="block w-full h-16" viewBox="0 0 300 64" preserveAspectRatio="none">
          <path class="fill-accent/14" [attr.d]="'M0 64 ' + LINE + ' L300 64 Z'" />
          <path
            class="stroke-accent"
            [attr.d]="'M0 64 ' + LINE"
            fill="none"
            stroke-width="2.5"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    </a>
  `,
  host: { class: 'block' },
  imports: [RouterLink, Icon],
})
export class PreviewCard {
  readonly SKILLS: PreviewSkill[] = SKILLS;
  readonly LINE: string = LINE;
}
