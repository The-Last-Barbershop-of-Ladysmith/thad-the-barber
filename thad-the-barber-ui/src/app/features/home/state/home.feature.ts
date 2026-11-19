import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { shopFeature } from '../../shop/state/shop.feature';
import { NextTimeSlot } from '../models/next-time-slot.model';
import { toAreNextTimesMissing, toNextTimeSlots } from '../utils/next-times.utils';
import { homeReducer } from './home.reducer';
import { HomeState } from './home.state';

/** Selectors derived from the generated ones; exposed on `homeFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type HomeExtraSelectors = {
  selectNextTimeSlots: MemoizedSelector<object, NextTimeSlot[]>;
  selectAreNextTimesMissing: MemoizedSelector<object, boolean>;
};

/** Store key for this slice. */
export const homeFeatureKey: 'home' = 'home' as const;

/**
 * The home page's open times, registered with the home route; nothing is saved to storage.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: homeFeatureKey,
  reducer: homeReducer,
  extraSelectors: ({
    selectNextTimes,
    selectNextTimesStatus,
  }: FeatureSelectors<HomeState>): HomeExtraSelectors => ({
    selectNextTimeSlots: createSelector(
      selectNextTimes,
      shopFeature.selectTimeZone,
      toNextTimeSlots,
    ),
    selectAreNextTimesMissing: createSelector(
      selectNextTimesStatus,
      selectNextTimes,
      toAreNextTimesMissing,
    ),
  }),
});
