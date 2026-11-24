import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../../shared/models/request.models';
import { adminAnnouncementTextsReducer } from './admin-announcement-texts.reducer';
import { AdminAnnouncementTextsState } from './admin-announcement-texts.state';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AdminAnnouncementTextsExtraSelectors = {
  selectIsPreviewing: MemoizedSelector<object, boolean>;
  selectIsSending: MemoizedSelector<object, boolean>;
};

export const adminAnnouncementTextsFeatureKey: 'adminAnnouncementTexts' = 'adminAnnouncementTexts' as const;

/** Registered with the announcements routes, so the public site never loads it. Not saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const adminAnnouncementTextsFeature = createFeature({
  name: adminAnnouncementTextsFeatureKey,
  reducer: adminAnnouncementTextsReducer,
  extraSelectors: (
    { selectPreviewStatus, selectSendStatus }: FeatureSelectors<AdminAnnouncementTextsState>,
  ): AdminAnnouncementTextsExtraSelectors => ({
    selectIsPreviewing: createSelector(
      selectPreviewStatus,
      (previewStatus: RequestStatus): boolean => previewStatus === RequestStatus.Pending,
    ),
    selectIsSending: createSelector(
      selectSendStatus,
      (sendStatus: RequestStatus): boolean => sendStatus === RequestStatus.Pending,
    ),
  }),
});
