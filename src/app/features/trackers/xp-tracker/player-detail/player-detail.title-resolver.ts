import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';

export const playerDetailTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  `${CapitalizePipe.capitalise(route.params['username'])} - XP Tracker - OSRS Tracker`;
