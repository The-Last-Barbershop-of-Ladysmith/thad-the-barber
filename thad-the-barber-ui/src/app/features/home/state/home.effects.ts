import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import {
  EMPTY,
  Observable,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  filter,
  fromEvent,
  map,
  of,
  startWith,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import { NEXT_TIMES_POLL_INTERVAL_MS } from '../config/next-times';
import { GalleryPhoto, HomeContent } from '../models/home.models';
import { GalleryService } from '../services/gallery.service';
import { HomeContentService } from '../services/home-content.service';
import { NextTimesService } from '../services/next-times.service';
import { SmsSignupService } from '../services/sms-signup.service';
import * as HomeActions from './home.actions';

export const loadHomeContent: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    content: HomeContentService = inject(HomeContentService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.HomePageOpen),
      switchMap((): Observable<Action> =>
        content.getContent().pipe(
          map((result: HomeContent): Action => HomeActions.HomeContentRequestSuccess({ content: result })),
          catchError((): Observable<Action> =>
            of(HomeActions.HomeContentRequestFailure({ error: 'Could not load the latest news.' }))),
        )),
    ),
  { functional: true },
);

/** Browser only: a prerendered gallery would wait for the next deploy to change. */
export const loadGallery: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    gallery: GalleryService = inject(GalleryService),
    platformId: object = inject(PLATFORM_ID),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.HomePageOpen),
      filter((): boolean => isPlatformBrowser(platformId)),
      switchMap((): Observable<Action> =>
        gallery.getPhotos().pipe(
          map((photos: GalleryPhoto[]): Action => HomeActions.GalleryRequestSuccess({ photos })),
          catchError((): Observable<Action> => of(HomeActions.GalleryRequestFailure())),
        )),
    ),
  { functional: true },
);

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
        fromEvent(document, 'visibilitychange').pipe(
          startWith(null),
          map((): boolean => document.visibilityState === 'visible'),
          distinctUntilChanged(),
          switchMap((isVisible: boolean): Observable<number> =>
            isVisible ? timer(0, NEXT_TIMES_POLL_INTERVAL_MS) : EMPTY),
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

export const subscribeToSms: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    sms: SmsSignupService = inject(SmsSignupService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.SmsSignupRequest),
      exhaustMap(({ phone }: { phone: string; }): Observable<Action> =>
        sms.subscribe(phone).pipe(
          map((result: { phone: string; }): Action => HomeActions.SmsSignupRequestSuccess({ phone: result.phone })),
          catchError((): Observable<Action> =>
            of(HomeActions.SmsSignupRequestFailure({ error: 'Something went wrong. Try again?' }))),
        )),
    ),
  { functional: true },
);
