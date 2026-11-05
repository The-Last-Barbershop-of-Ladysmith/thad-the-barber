import { GalleryPhoto } from '../models/home.models';
import * as HomeActions from './home.actions';
import { homeReducer } from './home.reducer';
import { HomeState, initialHomeState } from './home.state';
import { RequestStatus } from '../../../shared/models/request.models';

const photos: GalleryPhoto[] = [{ src: 'https://media.test/gallery/low-taper.jpg', alt: 'Low taper' }, { src: 'https://media.test/gallery/beard_line-up.png', alt: 'Beard line up' }];

describe(
  'home reducer',
  (): void => {
    it(
      'replaces the gallery with the loaded photos',
      (): void => {
        const before: HomeState = { ...initialHomeState, gallery: photos.slice(0, 1) };

        const state: HomeState = homeReducer(before, HomeActions.GalleryRequestSuccess({ photos }));

        expect(state.gallery).toEqual(photos);
      },
    );

    it(
      'drops a saved gallery when the page opens, even one in an older shape',
      (): void => {
        const saved: unknown[] = [{ src: 'assets/gallery/old-01.webp', alt: 'Saved before the media container' }];
        const before: HomeState = { ...initialHomeState, gallery: saved as GalleryPhoto[] };

        const state: HomeState = homeReducer(before, HomeActions.HomePageOpen());

        expect(state.gallery).toEqual([]);
        expect(state.galleryStatus).toBe(RequestStatus.Pending);
      },
    );

    it(
      'marks a failed gallery load, so its nav links hide',
      (): void => {
        const state: HomeState = homeReducer(initialHomeState, HomeActions.GalleryRequestFailure());

        expect(state.galleryStatus).toBe(RequestStatus.Error);
      },
    );
  },
);

describe(
  'home reducer next times',
  (): void => {
    const startAts: string[] = ['2026-10-04T20:00:00Z', '2026-10-04T20:30:00Z'];

    it(
      'replaces the times with the loaded ones',
      (): void => {
        const before: HomeState = { ...initialHomeState, nextTimes: ['2026-10-03T20:00:00Z'] };

        const state: HomeState = homeReducer(before, HomeActions.NextTimesRequestSuccess({ startAts }));

        expect(state.nextTimes).toEqual(startAts);
        expect(state.nextTimesStatus).toBe(RequestStatus.Success);
      },
    );

    it(
      'keeps the last times when a refresh fails',
      (): void => {
        const before: HomeState = {
          ...initialHomeState,
          nextTimes: startAts,
          nextTimesStatus: RequestStatus.Success,
        };

        const state: HomeState = homeReducer(before, HomeActions.NextTimesRequestFailure());

        expect(state.nextTimes).toEqual(startAts);
        expect(state.nextTimesStatus).toBe(RequestStatus.Error);
      },
    );
  },
);
