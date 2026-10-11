import { GalleryPhoto } from '../models/home.models';
import { HomeApiActions } from './home.actions';
import { homeReducer } from './home.reducer';
import { HomeState, initialHomeState } from './home.state';

const photos: GalleryPhoto[] = [
  {
    id: 'taper-01',
    image: 'taper-01',
    alt: 'Low taper with a hard part',
    width: 960,
    height: 1280,
  },
  {
    id: 'beard-02',
    image: 'beard-02',
    alt: 'Beard line-up, front view',
    width: 2048,
    height: 1536,
  },
];

describe(
  'home reducer',
  (): void => {
    it(
      'replaces the gallery with the loaded photos',
      (): void => {
        const before: HomeState = { ...initialHomeState, gallery: photos.slice(0, 1) };

        const state: HomeState = homeReducer(before, HomeApiActions.galleryLoaded({ photos }));

        expect(state.gallery).toEqual(photos);
      },
    );

    it(
      'empties a saved gallery when loading fails, so the section hides',
      (): void => {
        const before: HomeState = { ...initialHomeState, gallery: photos };

        const state: HomeState = homeReducer(before, HomeApiActions.galleryLoadFailed());

        expect(state.gallery).toEqual([]);
      },
    );
  },
);
