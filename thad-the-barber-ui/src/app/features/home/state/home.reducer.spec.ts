import { GalleryPhoto } from '../models/home.models';
import { HomeApiActions, HomePageActions } from './home.actions';
import { homeReducer } from './home.reducer';
import { HomeState, initialHomeState } from './home.state';

const photos: GalleryPhoto[] = [{ src: 'https://media.test/gallery/low-taper.jpg', alt: 'Low taper' }, { src: 'https://media.test/gallery/beard_line-up.png', alt: 'Beard line up' }];

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
      'drops a saved gallery when the page opens, even one in an older shape',
      (): void => {
        const saved: unknown[] = [{ src: 'assets/gallery/old-01.webp', alt: 'Saved before the media container' }];
        const before: HomeState = { ...initialHomeState, gallery: saved as GalleryPhoto[] };

        const state: HomeState = homeReducer(before, HomePageActions.opened());

        expect(state.gallery).toEqual([]);
      },
    );
  },
);
