import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, filter, map, of, switchMap } from 'rxjs';
import * as HomeActions from '../../home/state/home.actions';
import { ReviewsResponse } from '../dtos/reviews-response.dto';
import { ReviewsService } from '../services/reviews.service';
import * as ReviewsActions from './reviews.actions';

/** Browser only: prerendered reviews would wait for the next deploy to change. */
export const requestReviewsOnHomeOpen: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    platformId: object = inject(PLATFORM_ID),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.HomePageOpen),
      filter((): boolean => isPlatformBrowser(platformId)),
      map((): Action => ReviewsActions.ReviewsRequest()),
    ),
  { functional: true },
);

export const loadReviews: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    reviews: ReviewsService = inject(ReviewsService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(ReviewsActions.ReviewsRequest),
      switchMap((): Observable<Action> =>
        reviews.getReviews().pipe(
          map(({ testimonials, rating }: ReviewsResponse): Action =>
            ReviewsActions.ReviewsRequestSuccess({ testimonials, rating })),
          catchError((): Observable<Action> => of(ReviewsActions.ReviewsRequestFailure())),
        )),
    ),
  { functional: true },
);
