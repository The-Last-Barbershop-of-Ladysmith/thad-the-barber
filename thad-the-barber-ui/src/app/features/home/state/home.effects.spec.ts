import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import {
  Observable,
  Subject,
  of,
  throwError,
} from 'rxjs';
import { GalleryPhoto } from '../models/home.models';
import { GalleryService } from '../services/gallery.service';
import { HomeApiActions, HomePageActions } from './home.actions';
import { loadGallery } from './home.effects';

describe(
  'loadGallery',
  (): void => {
    const photos: GalleryPhoto[] = [
      {
        id: 'crop-05',
        image: 'crop-05',
        alt: 'Textured crop with a mid fade',
        width: 640,
        height: 800,
      },
    ];

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
      actions$.next(HomePageActions.opened());
      return emitted;
    }

    it(
      'loads the photos when the home page opens in the browser',
      (): void => {
        expect(run('browser', (): Observable<GalleryPhoto[]> => of(photos))).toEqual([HomeApiActions.galleryLoaded({ photos })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<GalleryPhoto[]> = (): Observable<GalleryPhoto[]> =>
          throwError((): Error => new Error('503'));

        expect(run('browser', failing)).toEqual([HomeApiActions.galleryLoadFailed()]);
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
