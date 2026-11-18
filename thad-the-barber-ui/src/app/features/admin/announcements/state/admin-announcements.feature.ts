import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../../shared/models/request.models';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { adminAnnouncementsReducer } from './admin-announcements.reducer';
import { AdminAnnouncementsState } from './admin-announcements.state';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AdminAnnouncementsExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectIsSaving: MemoizedSelector<object, boolean>;
  selectIsImageUploading: MemoizedSelector<object, boolean>;
  /** True once a list has arrived, so a page can tell "none yet" from "not loaded". */
  selectIsLoaded: MemoizedSelector<object, boolean>;
  selectAnnouncements: MemoizedSelector<object, AdminAnnouncementDto[]>;
};

export const adminAnnouncementsFeatureKey: 'adminAnnouncements' = 'adminAnnouncements' as const;

/** Registered with the announcements routes, so the public site never loads it. Not saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const adminAnnouncementsFeature = createFeature({
  name: adminAnnouncementsFeatureKey,
  reducer: adminAnnouncementsReducer,
  extraSelectors: (
    {
      selectLoadStatus,
      selectSaveStatus,
      selectImageUploadStatus,
      selectAnnouncements,
    }: FeatureSelectors<AdminAnnouncementsState>,
  ): AdminAnnouncementsExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      (loadStatus: RequestStatus): boolean => loadStatus === RequestStatus.Pending,
    ),
    selectIsSaving: createSelector(
      selectSaveStatus,
      (saveStatus: RequestStatus): boolean => saveStatus === RequestStatus.Pending,
    ),
    selectIsImageUploading: createSelector(
      selectImageUploadStatus,
      (imageUploadStatus: RequestStatus): boolean => imageUploadStatus === RequestStatus.Pending,
    ),
    selectIsLoaded: createSelector(
      selectLoadStatus,
      (loadStatus: RequestStatus): boolean => loadStatus === RequestStatus.Success,
    ),
    selectAnnouncements,
  }),
});
