import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, filter, map, of, switchMap } from 'rxjs';
import { ExceptionReporter } from '../../../core/telemetry/exception-reporter';
import * as HomeActions from '../../home/state/home.actions';
import { GalleryPhoto } from '../models/gallery-photo.model';
import { GalleryService } from '../services/gallery.service';
import * as GalleryActions from './gallery.actions';

/** Browser only: a prerendered gallery would wait for the next deploy to change. */
export const requestGalleryOnHomeOpen: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    platformId: object = inject(PLATFORM_ID),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.HomePageOpen),
      filter((): boolean => isPlatformBrowser(platformId)),
      map((): Action => GalleryActions.GalleryRequest()),
    ),
  { functional: true },
);

export const loadGallery: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    gallery: GalleryService = inject(GalleryService),
    exceptionReporter: ExceptionReporter = inject(ExceptionReporter),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(GalleryActions.GalleryRequest),
      switchMap((): Observable<Action> =>
        gallery.getPhotos().pipe(
          map((photos: GalleryPhoto[]): Action => GalleryActions.GalleryRequestSuccess({ photos })),
          catchError((error: unknown): Observable<Action> => {
            exceptionReporter.reportLoadFailure('gallery', error);
            return of(GalleryActions.GalleryRequestFailure());
          }),
        )),
    ),
  { functional: true },
);
