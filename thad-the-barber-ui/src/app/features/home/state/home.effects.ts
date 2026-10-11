import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import {
  Actions,
  FunctionalEffect,
  createEffect,
  ofType,
} from '@ngrx/effects';
import { Action } from '@ngrx/store';
import {
  Observable,
  catchError,
  exhaustMap,
  filter,
  map,
  of,
  switchMap,
} from 'rxjs';
import { GalleryPhoto, HomeContent } from '../models/home.models';
import { GalleryService } from '../services/gallery.service';
import { HomeContentService } from '../services/home-content.service';
import { SmsSignupService } from '../services/sms-signup.service';
import { HomeApiActions, HomePageActions } from './home.actions';

export const loadHomeContent: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    content: HomeContentService = inject(HomeContentService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomePageActions.opened),
      switchMap((): Observable<Action> =>
        content.getContent().pipe(
          map((result: HomeContent): Action => HomeApiActions.contentLoaded({ content: result })),
          catchError((): Observable<Action> =>
            of(HomeApiActions.contentLoadFailed({ error: 'Could not load the latest news.' }))),
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
      ofType(HomePageActions.opened),
      filter((): boolean => isPlatformBrowser(platformId)),
      switchMap((): Observable<Action> =>
        gallery.getPhotos().pipe(
          map((photos: GalleryPhoto[]): Action => HomeApiActions.galleryLoaded({ photos })),
          catchError((): Observable<Action> => of(HomeApiActions.galleryLoadFailed())),
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
      ofType(HomePageActions.smsSignupSubmitted),
      exhaustMap(({ phone }: { phone: string; }): Observable<Action> =>
        sms.subscribe(phone).pipe(
          map((result: { phone: string; }): Action => HomeApiActions.smsSignupSucceeded({ phone: result.phone })),
          catchError((): Observable<Action> =>
            of(HomeApiActions.smsSignupFailed({ error: 'Something went wrong. Try again?' }))),
        )),
    ),
  { functional: true },
);
