import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, filter, map, of, switchMap, takeUntil } from 'rxjs';
import { pollWhileVisible } from '../../../shared/utils/poll-while-visible.utils';
import { NEXT_TIMES_POLL_INTERVAL_MS } from '../config/next-times';
import { NextTimesService } from '../services/next-times.service';
import * as HomeActions from './home.actions';

/**
 * Browser only, while the home page is open: loads the next open times when the tab is visible, again every minute,
 * and at once when it becomes visible after being hidden; nothing is requested while it's hidden. A failed refresh
 * leaves the last times in the slice.
 */
export const pollNextTimes: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    nextTimes: NextTimesService = inject(NextTimesService),
    platformId: object = inject(PLATFORM_ID),
    document: Document = inject(DOCUMENT),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.HomePageOpen),
      filter((): boolean => isPlatformBrowser(platformId)),
      switchMap((): Observable<Action> =>
        pollWhileVisible(document, NEXT_TIMES_POLL_INTERVAL_MS).pipe(
          switchMap((): Observable<Action> =>
            nextTimes.getNextTimes().pipe(
              map((startAts: string[]): Action => HomeActions.NextTimesRequestSuccess({ startAts })),
              catchError((): Observable<Action> => of(HomeActions.NextTimesRequestFailure())),
            )),
          takeUntil(actions$.pipe(ofType(HomeActions.HomePageClose))),
        )),
    ),
  { functional: true },
);
