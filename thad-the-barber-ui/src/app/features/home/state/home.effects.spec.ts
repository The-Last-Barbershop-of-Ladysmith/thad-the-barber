import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Announcement, GalleryPhoto } from '../models/home.models';
import { AnnouncementsService } from '../services/announcements.service';
import { GalleryService } from '../services/gallery.service';
import * as HomeActions from './home.actions';
import { loadAnnouncements, loadGallery } from './home.effects';

describe(
  'loadGallery',
  (): void => {
    const photos: GalleryPhoto[] = [{ src: 'https://media.test/gallery/textured-crop.jpg', alt: 'Textured crop' }];

    function run(platform: string, getPhotos: () => Observable<GalleryPhoto[]>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: GalleryService, useValue: { getPhotos } },
          { provide: PLATFORM_ID, useValue: platform },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadGallery() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(HomeActions.HomePageOpen());
      return emitted;
    }

    it(
      'loads the photos when the home page opens in the browser',
      (): void => {
        expect(run('browser', (): Observable<GalleryPhoto[]> => of(photos))).toEqual([HomeActions.GalleryRequestSuccess({ photos })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<GalleryPhoto[]> = (): Observable<GalleryPhoto[]> =>
          throwError((): Error => new Error('503'));

        expect(run('browser', failing)).toEqual([HomeActions.GalleryRequestFailure()]);
      },
    );

    it(
      'does nothing while prerendering, so the gallery is never baked into the page',
      (): void => {
        const getPhotos: () => Observable<GalleryPhoto[]> = vi.fn((): Observable<GalleryPhoto[]> => of(photos));

        expect(run('server', getPhotos)).toEqual([]);
        expect(getPhotos).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'loadAnnouncements',
  (): void => {
    const announcements: Announcement[] = [
      {
        title: 'Closed for a made-up holiday',
        bodyHtml: '',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        image: null,
        buttons: [],
      },
    ];

    function run(platform: string, getAnnouncements: () => Observable<Announcement[]>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: AnnouncementsService, useValue: { getAnnouncements } },
          { provide: PLATFORM_ID, useValue: platform },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadAnnouncements() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(HomeActions.HomePageOpen());
      return emitted;
    }

    it(
      'loads the announcements when the home page opens in the browser',
      (): void => {
        expect(run('browser', (): Observable<Announcement[]> => of(announcements)))
          .toEqual([HomeActions.AnnouncementsRequestSuccess({ announcements })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<Announcement[]> = (): Observable<Announcement[]> =>
          throwError((): Error => new Error('404'));

        expect(run('browser', failing)).toEqual([HomeActions.AnnouncementsRequestFailure()]);
      },
    );

    it(
      'does nothing while prerendering, so announcements are never baked into the page',
      (): void => {
        const getAnnouncements: () => Observable<Announcement[]> = vi.fn(
          (): Observable<Announcement[]> => of(announcements),
        );

        expect(run('server', getAnnouncements)).toEqual([]);
        expect(getAnnouncements).not.toHaveBeenCalled();
      },
    );
  },
);
