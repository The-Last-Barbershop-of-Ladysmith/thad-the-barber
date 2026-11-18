import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../../shared/models/request.models';
import { adminGalleryReducer } from './admin-gallery.reducer';
import { AdminGalleryState } from './admin-gallery.state';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AdminGalleryExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectIsLoaded: MemoizedSelector<object, boolean>;
  selectIsUploading: MemoizedSelector<object, boolean>;
  selectIsUploaded: MemoizedSelector<object, boolean>;
  selectIsDeleting: MemoizedSelector<object, boolean>;
};

export const adminGalleryFeatureKey: 'adminGallery' = 'adminGallery' as const;

/** Registered with the gallery admin route, so the public site never loads it. Not saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const adminGalleryFeature = createFeature({
  name: adminGalleryFeatureKey,
  reducer: adminGalleryReducer,
  extraSelectors: (
    {
      selectLoadStatus,
      selectUploadStatus,
      selectDeleteStatus,
    }: FeatureSelectors<AdminGalleryState>,
  ): AdminGalleryExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      (loadStatus: RequestStatus): boolean => loadStatus === RequestStatus.Pending,
    ),
    selectIsLoaded: createSelector(
      selectLoadStatus,
      (loadStatus: RequestStatus): boolean => loadStatus === RequestStatus.Success,
    ),
    selectIsUploading: createSelector(
      selectUploadStatus,
      (uploadStatus: RequestStatus): boolean => uploadStatus === RequestStatus.Pending,
    ),
    selectIsUploaded: createSelector(
      selectUploadStatus,
      (uploadStatus: RequestStatus): boolean => uploadStatus === RequestStatus.Success,
    ),
    selectIsDeleting: createSelector(
      selectDeleteStatus,
      (deleteStatus: RequestStatus): boolean => deleteStatus === RequestStatus.Pending,
    ),
  }),
});
