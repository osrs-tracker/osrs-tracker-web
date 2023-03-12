import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class XpTrackerComponent {
  loading: boolean;
  username: string;

  constructor(private cdRef: ChangeDetectorRef, private router: Router) {}

  searchUser(username: string) {
    if (!username) return;

    this.setLoading(true);

    this.router.navigate(['xp-tracker', username]);
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
    this.cdRef.detectChanges();
  }
}
