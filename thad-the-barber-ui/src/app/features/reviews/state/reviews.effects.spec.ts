import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import * as HomeActions from '../../home/state/home.actions';
import { ReviewsResponse } from '../dtos/reviews-response.dto';
import { ReviewsService } from '../services/reviews.service';
import * as ReviewsActions from './reviews.actions';
import { loadReviews, requestReviewsOnHomeOpen } from './reviews.effects';

describe(
  'requestReviewsOnHomeOpen',
  (): void => {
    function run(platform: string): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: PLATFORM_ID, useValue: platform },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => requestReviewsOnHomeOpen() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(HomeActions.HomePageOpen());
      return emitted;
    }

    it(
      'requests the reviews when the home page opens in the browser',
      (): void => {
        expect(run('browser')).toEqual([ReviewsActions.ReviewsRequest()]);
      },
    );

    it(
      'does nothing while prerendering, so the reviews are never baked into the page',
      (): void => {
        expect(run('server')).toEqual([]);
      },
    );
  },
);

describe(
  'loadReviews',
  (): void => {
    const response: ReviewsResponse = {
      testimonials: [
        {
          id: 'review-0',
          quote: 'Made-up text',
          author: 'Avery Testwell',
          source: 'Customer review',
          rating: 5,
        },
      ],
      rating: null,
    };

    function run(getReviews: () => Observable<ReviewsResponse>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: ReviewsService, useValue: { getReviews } },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadReviews() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(ReviewsActions.ReviewsRequest());
      return emitted;
    }

    it(
      'loads the reviews',
      (): void => {
        const emitted: Action[] = run((): Observable<ReviewsResponse> => of(response));

        expect(emitted).toEqual([
          ReviewsActions.ReviewsRequestSuccess({
            testimonials: response.testimonials,
            rating: null,
          }),
        ]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<ReviewsResponse> = (): Observable<ReviewsResponse> =>
          throwError((): Error => new Error('404'));

        expect(run(failing)).toEqual([ReviewsActions.ReviewsRequestFailure()]);
      },
    );
  },
);
