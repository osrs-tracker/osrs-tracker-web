import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, InputSignal, OnInit } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { ModeRanks } from './mode-ranks';

interface RankLine {
  label: string;
  /** `null` unranked, `undefined` while it loads */
  rank?: number | null;
  failed: boolean;
  reload?: () => void;
}

/**
 * A hiscores tooltip's ranks: among all accounts, then among the player's game mode and build (`ModeRanks`). Opening
 * the first of these tooltips renders this, which loads those tables.
 */
@Component({
  selector: 'rank-lines',
  imports: [DecimalPipe, LoadError, Skeleton],
  template: `
    @for (line of lines(); track line.label) {
      <div class="flex items-center justify-between gap-4">
        <span>{{ line.label }}:</span>
        @if (line.failed) {
          <load-error inline source="player-mode-ranks" message="Couldn't load" (retry)="line.reload?.()" />
        } @else if (line.rank === undefined) {
          <skeleton class="h-4 w-14" />
        } @else {
          <span class="tabular-nums">{{ line.rank === null ? 'Unranked' : (line.rank | number) }}</span>
        }
      </div>
    }
  `,
  host: { class: 'block mt-2 pt-2 border-t border-line' },
})
export class RankLines implements OnInit {
  private readonly modeRanks = inject(ModeRanks);

  readonly kind: InputSignal<'skills' | 'activities'> = input.required();
  /** A skill or activity */
  readonly name: InputSignal<string> = input.required();
  /** On the main table; `null` or `undefined` unranked */
  readonly rank: InputSignal<number | null | undefined> = input.required();

  readonly lines = computed<RankLine[]>(() => [
    { label: 'Rank', rank: this.rank() ?? null, failed: false },
    ...this.modeRanks.tables().map(table => ({
      label: `${table.label} rank`,
      rank: table.hiscore ? this.rankOn(table.hiscore) : undefined,
      failed: table.failed,
      reload: table.reload,
    })),
  ]);

  ngOnInit(): void {
    this.modeRanks.load();
  }

  private rankOn(hiscore: Pick<HiscoreEntry, 'skills' | 'activities'>): number | null {
    const ranks = hiscore[this.kind()] as Record<string, { rank: number | null } | null | undefined>;
    return ranks[this.name()]?.rank ?? null;
  }
}
