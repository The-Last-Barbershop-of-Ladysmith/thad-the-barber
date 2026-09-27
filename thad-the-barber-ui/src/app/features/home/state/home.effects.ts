import { inject } from '@angular/core';
import { Actions, type FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { type Action } from '@ngrx/store';
import { type Observable, catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { type HomeContent } from '../models/home.models';
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
