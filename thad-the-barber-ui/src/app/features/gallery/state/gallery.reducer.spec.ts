import { RequestStatus } from '../../../shared/models/request.models';
import { GalleryPhoto } from '../models/gallery-photo.model';
import * as GalleryActions from './gallery.actions';
import { galleryReducer } from './gallery.reducer';
import { GalleryState, initialGalleryState } from './gallery.state';

const photos: GalleryPhoto[] = [
  { src: 'https://media.test/gallery/low-taper.jpg', alt: 'Low taper' },
  { src: 'https://media.test/gallery/beard_line-up.png', alt: 'Beard line up' },
];

describe(
  'gallery reducer',
  (): void => {
    it(
      'keeps the photos on screen while a new request runs, so a revisit does not flash a placeholder',
      (): void => {
        const before: GalleryState = { photos: photos.slice(0, 1), loadStatus: RequestStatus.Success };

        const state: GalleryState = galleryReducer(before, GalleryActions.GalleryRequest());

        expect(state).toEqual({ photos: photos.slice(0, 1), loadStatus: RequestStatus.Pending });
      },
    );

    it(
      'replaces the photos with the loaded ones',
      (): void => {
        const before: GalleryState = { photos: photos.slice(0, 1), loadStatus: RequestStatus.Pending };

        const state: GalleryState = galleryReducer(before, GalleryActions.GalleryRequestSuccess({ photos }));

        expect(state).toEqual({ photos, loadStatus: RequestStatus.Success });
      },
    );

    it(
      'marks a failed load, so the nav links hide',
      (): void => {
        const state: GalleryState = galleryReducer(initialGalleryState, GalleryActions.GalleryRequestFailure());

        expect(state.loadStatus).toBe(RequestStatus.Error);
      },
    );
  },
);
