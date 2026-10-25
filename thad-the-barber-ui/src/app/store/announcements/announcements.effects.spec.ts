import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Event, NavigationEnd, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action, Store, provideStore } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TEST_ANNOUNCEMENT } from '../../../testing/test-announcement';
import { Announcement } from '../../core/models/announcements/announcement.model';
import { AnnouncementsService } from '../../core/services/announcements.service';
import * as AnnouncementsActions from './announcements.actions';
import { loadAnnouncements, requestAnnouncementsOnNavigation } from './announcements.effects';
import { announcementsFeature } from './announcements.feature';

describe(
  'requestAnnouncementsOnNavigation',
  (): void => {
    let navigations: Subject<Event>;
    let emitted: Action[];

    function start(platform: string): void {
      navigations = new Subject<Event>();
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [announcementsFeature.name]: announcementsFeature.reducer }),
          { provide: Router, useValue: { events: navigations } },
          { provide: PLATFORM_ID, useValue: platform },
        ],
      });
      emitted = [];
      TestBed.runInInjectionContext((): Observable<Action> => requestAnnouncementsOnNavigation() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
          TestBed.inject(Store).dispatch(action);
        });
    }

    function navigate(url: string): void {
      navigations.next(new NavigationEnd(
        1,
        url,
        url,
      ));
    }

    it(
      'requests the announcements on the first navigation, whichever page it is',
      (): void => {
        start('browser');

        navigate('/book');

        expect(emitted).toEqual([AnnouncementsActions.AnnouncementsRequest()]);
      },
    );

    it(
      'does not request them again while they load or once they have loaded',
      (): void => {
        start('browser');
        navigate('/');
        navigate('/book');
        TestBed.inject(Store).dispatch(AnnouncementsActions.AnnouncementsRequestSuccess({ announcements: [] }));
        navigate('/');

        expect(emitted).toEqual([AnnouncementsActions.AnnouncementsRequest()]);
      },
    );

    it(
      'tries again on the next navigation after a failure',
      (): void => {
        start('browser');
        navigate('/');
        TestBed.inject(Store).dispatch(AnnouncementsActions.AnnouncementsRequestFailure());
        navigate('/book');

        expect(emitted).toEqual([
          AnnouncementsActions.AnnouncementsRequest(),
          AnnouncementsActions.AnnouncementsRequest(),
        ]);
      },
    );

    it(
      'does nothing while prerendering, so announcements are never baked into the page',
      (): void => {
        start('server');

        navigate('/');

        expect(emitted).toEqual([]);
      },
    );
  },
);

describe(
  'loadAnnouncements',
  (): void => {
    function run(getAnnouncements: () => Observable<Announcement[]>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: AnnouncementsService, useValue: { getAnnouncements } },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadAnnouncements() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(AnnouncementsActions.AnnouncementsRequest());
      return emitted;
    }

    it(
      'stores the announcements the media container holds',
      (): void => {
        const loading: () => Observable<Announcement[]> = (): Observable<Announcement[]> => of([TEST_ANNOUNCEMENT]);

        expect(run(loading))
          .toEqual([AnnouncementsActions.AnnouncementsRequestSuccess({ announcements: [TEST_ANNOUNCEMENT] })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<Announcement[]> = (): Observable<Announcement[]> =>
          throwError((): Error => new Error('404'));

        expect(run(failing)).toEqual([AnnouncementsActions.AnnouncementsRequestFailure()]);
      },
    );
  },
);
