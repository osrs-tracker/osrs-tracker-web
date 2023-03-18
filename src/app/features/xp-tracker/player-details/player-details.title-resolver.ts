import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

export const playerDetailsTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  `${route.params['username']} - XP Tracker - OSRS Tracker`;
