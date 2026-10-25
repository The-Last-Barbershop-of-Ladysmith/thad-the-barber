import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, catchError, exhaustMap, filter, map, of, withLatestFrom } from 'rxjs';
import { Announcement } from '../models/announcement.model';
import { AnnouncementsService } from '../services/announcements.service';
import { RequestStatus } from '../../../shared/models/request.models';
import * as HomeActions from '../../home/state/home.actions';
import { AppState } from '../../../store/app.state';
import * as AnnouncementsActions from './announcements.actions';
import { announcementsFeature } from './announcements.feature';

/**
 * The first navigation loads the announcements, and the next one after a failure tries again. Browser only:
 * prerendered announcements would wait for the next deploy to change.
 */
export const requestAnnouncementsOnNavigation: FunctionalEffect = createEffect(
  (
    router: Router = inject(Router),
    store: Store<AppState> = inject<Store<AppState>>(Store),
    platformId: object = inject(PLATFORM_ID),
  ): Observable<Action> =>
    router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      filter((): boolean => isPlatformBrowser(platformId)),
      withLatestFrom(store.select(announcementsFeature.selectLoadStatus)),
      filter(([, status]: [NavigationEnd, RequestStatus]): boolean =>
        status === RequestStatus.Idle || status === RequestStatus.Error),
      map((): Action => AnnouncementsActions.AnnouncementsRequest()),
    ),
  { functional: true },
);

/**
 * Opening the home page fetches them again, so an edit or deletion shows without a reload, and a tab left open
 * overnight drops the ones that ended. The list on screen stays until the new one arrives.
 */
export const refreshAnnouncementsOnHomeOpen: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    platformId: object = inject(PLATFORM_ID),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(HomeActions.HomePageOpen),
      filter((): boolean => isPlatformBrowser(platformId)),
      map((): Action => AnnouncementsActions.AnnouncementsRequest()),
    ),
  { functional: true },
);

export const loadAnnouncements: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    announcementsService: AnnouncementsService = inject(AnnouncementsService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AnnouncementsActions.AnnouncementsRequest),
      exhaustMap((): Observable<Action> =>
        announcementsService.getAnnouncements().pipe(
          map((announcements: Announcement[]): Action =>
            AnnouncementsActions.AnnouncementsRequestSuccess({ announcements })),
          catchError((): Observable<Action> => of(AnnouncementsActions.AnnouncementsRequestFailure())),
        )),
    ),
  { functional: true },
);
