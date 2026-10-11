import { Announcement, GalleryPhoto } from '../models/home.models';
import { HomeApiActions, HomePageActions } from './home.actions';
import { homeReducer } from './home.reducer';
import { HomeState, initialHomeState } from './home.state';

const announcement: Announcement = {
  title: 'Made-up special',
  bodyHtml: '<p>Test body</p>',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  image: null,
  buttons: [],
};

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

    it(
      'replaces the announcements with the loaded ones',
      (): void => {
        const before: HomeState = { ...initialHomeState, announcements: [{ ...announcement, title: 'Old' }] };

        const state: HomeState = homeReducer(before, HomeApiActions.announcementsLoaded({ announcements: [announcement] }));

        expect(state.announcements).toEqual([announcement]);
      },
    );

    it(
      'drops saved announcements when the page opens, so a deleted one never flashes',
      (): void => {
        const before: HomeState = { ...initialHomeState, announcements: [announcement] };

        const state: HomeState = homeReducer(before, HomePageActions.opened());

        expect(state.announcements).toEqual([]);
      },
    );
  },
);
