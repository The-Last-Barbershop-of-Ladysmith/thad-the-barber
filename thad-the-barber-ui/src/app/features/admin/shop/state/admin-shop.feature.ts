import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../../shared/models/request.models';
import { adminShopReducer } from './admin-shop.reducer';
import { AdminShopState } from './admin-shop.state';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AdminShopExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
  selectIsLoaded: MemoizedSelector<object, boolean>;
  selectIsSaving: MemoizedSelector<object, boolean>;
  selectIsSaved: MemoizedSelector<object, boolean>;
};

export const adminShopFeatureKey: 'adminShop' = 'adminShop' as const;

/** Registered with the shop info route, so the public site never loads it. Not saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const adminShopFeature = createFeature({
  name: adminShopFeatureKey,
  reducer: adminShopReducer,
  extraSelectors: (
    { selectLoadStatus, selectSaveStatus }: FeatureSelectors<AdminShopState>,
  ): AdminShopExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      (loadStatus: RequestStatus): boolean => loadStatus === RequestStatus.Pending,
    ),
    selectIsLoaded: createSelector(
      selectLoadStatus,
      (loadStatus: RequestStatus): boolean => loadStatus === RequestStatus.Success,
    ),
    selectIsSaving: createSelector(
      selectSaveStatus,
      (saveStatus: RequestStatus): boolean => saveStatus === RequestStatus.Pending,
    ),
    selectIsSaved: createSelector(
      selectSaveStatus,
      (saveStatus: RequestStatus): boolean => saveStatus === RequestStatus.Success,
    ),
  }),
});
