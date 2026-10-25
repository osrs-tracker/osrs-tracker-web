import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, OnInit } from '@angular/core';
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

/** Rendering the first of these tooltips loads the mode tables (`ModeRanks`). */
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

  readonly kind = input.required<'skills' | 'activities'>();
  readonly name = input.required<string>();
  /** On the main table; `null` or `undefined` unranked */
  readonly rank = input.required<number | null | undefined>();

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
