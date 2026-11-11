import { RequestStatus } from '../../../shared/models/request.models';
import { galleryFeature, galleryFeatureKey } from './gallery.feature';
import { GalleryState, initialGalleryState } from './gallery.state';

describe(
  'selectIsLoading',
  (): void => {
    it.each([
      [RequestStatus.Idle, true],
      [RequestStatus.Pending, true],
      [RequestStatus.Success, false],
      [RequestStatus.Error, false],
    ])(
      'for a load status of %s is %s, so a placeholder holds the gallery until it answers',
      (loadStatus: RequestStatus, isLoading: boolean): void => {
        const state: GalleryState = { ...initialGalleryState, loadStatus };

        expect(galleryFeature.selectIsLoading({ [galleryFeatureKey]: state })).toBe(isLoading);
      },
    );
  },
);
