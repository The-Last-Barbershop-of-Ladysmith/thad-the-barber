import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import * as HomeActions from '../../home/state/home.actions';
import { GalleryPhoto } from '../models/gallery-photo.model';
import { GalleryService } from '../services/gallery.service';
import * as GalleryActions from './gallery.actions';
import { loadGallery, requestGalleryOnHomeOpen } from './gallery.effects';

describe(
  'requestGalleryOnHomeOpen',
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
      TestBed.runInInjectionContext((): Observable<Action> => requestGalleryOnHomeOpen() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(HomeActions.HomePageOpen());
      return emitted;
    }

    it(
      'requests the gallery when the home page opens in the browser',
      (): void => {
        expect(run('browser')).toEqual([GalleryActions.GalleryRequest()]);
      },
    );

    it(
      'does nothing while prerendering, so the gallery is never baked into the page',
      (): void => {
        expect(run('server')).toEqual([]);
      },
    );
  },
);

describe(
  'loadGallery',
  (): void => {
    const photos: GalleryPhoto[] = [{ src: 'https://media.test/gallery/textured-crop.jpg', alt: 'Textured crop' }];

    function run(getPhotos: () => Observable<GalleryPhoto[]>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: GalleryService, useValue: { getPhotos } },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadGallery() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(GalleryActions.GalleryRequest());
      return emitted;
    }

    it(
      'loads the photos',
      (): void => {
        const emitted: Action[] = run((): Observable<GalleryPhoto[]> => of(photos));

        expect(emitted).toEqual([GalleryActions.GalleryRequestSuccess({ photos })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<GalleryPhoto[]> = (): Observable<GalleryPhoto[]> =>
          throwError((): Error => new Error('503'));

        expect(run(failing)).toEqual([GalleryActions.GalleryRequestFailure()]);
      },
    );
  },
);
