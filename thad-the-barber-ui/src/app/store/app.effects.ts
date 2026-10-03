import { inject } from '@angular/core';
import {
  Event,
  NavigationEnd,
  Router,
} from '@angular/router';
import { FunctionalEffect, createEffect } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import {
  Observable,
  filter,
  map,
} from 'rxjs';
import { LayoutActions } from './app.actions';

/** Close the mobile menu whenever navigation finishes (including in-page fragment jumps). */
export const closeMenuOnNavigation: FunctionalEffect = createEffect(
  (router: Router = inject(Router)): Observable<Action> =>
    router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): Action => LayoutActions.menuClosed()),
    ),
  { functional: true },
);
