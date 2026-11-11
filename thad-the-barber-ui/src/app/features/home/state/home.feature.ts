import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { HomeSection } from '../../../shared/models/home-section.model';
import { NavItem } from '../../../shared/models/nav-item.model';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { isLoading, isSettledEmpty } from '../../../shared/utils/request.utils';
import { announcementsFeature } from '../../announcements/state/announcements.feature';
import { shopFeature } from '../../shop/state/shop.feature';
import { Testimonial } from '../models/home.models';
import { NextTimeSlot } from '../models/next-time-slot.model';
import { toAreNextTimesMissing, toNextTimeSlots } from '../utils/next-times.utils';
import { homeReducer } from './home.reducer';
import { HomeState, SmsSignupState } from './home.state';

/** Selectors derived from the generated ones; exposed on `homeFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type HomeExtraSelectors = {
  selectIsSubscribedToSms: MemoizedSelector<object, boolean>;
  selectIsSubscribingSms: MemoizedSelector<object, boolean>;
  selectIsContentLoading: MemoizedSelector<object, boolean>;
  selectHomeSections: MemoizedSelector<object, readonly NavItem[]>;
  selectNextTimeSlots: MemoizedSelector<object, NextTimeSlot[]>;
  selectAreNextTimesMissing: MemoizedSelector<object, boolean>;
  selectAreHeroFactsLoading: MemoizedSelector<object, boolean>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-home`). */
export const homeFeatureKey: 'home' = 'home' as const;

/**
 * The home page's reviews and the SMS signup, registered at bootstrap because the header and
 * footer link to its sections on every page. Its effects still register with the home route.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: homeFeatureKey,
  reducer: homeReducer,
  extraSelectors: ({
    selectSmsSignup,
    selectContentStatus,
    selectTestimonials,
    selectNextTimes,
    selectNextTimesStatus,
  }: FeatureSelectors<HomeState>): HomeExtraSelectors => ({
    selectIsSubscribedToSms: createSelector(
      selectSmsSignup,
      (smsSignup: SmsSignupState): boolean => smsSignup.status === RequestStatus.Success,
    ),
    selectIsSubscribingSms: createSelector(
      selectSmsSignup,
      (smsSignup: SmsSignupState): boolean => smsSignup.status === RequestStatus.Pending,
    ),
    selectIsContentLoading: createSelector(
      selectContentStatus,
      (contentStatus: RequestStatus): boolean => contentStatus === RequestStatus.Pending,
    ),
    selectHomeSections: createSelector(
      announcementsFeature.selectIsHidden,
      selectContentStatus,
      selectTestimonials,
      toHomeSections,
    ),
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
    selectAreHeroFactsLoading: createSelector(
      selectNextTimesStatus,
      selectContentStatus,
      toAreHeroFactsLoading,
    ),
  }),
});

/**
 * The home sections the header and footer link to, without the ones whose content turned out empty or failed to load
 * (BR-32, the reviews).
 */
function toHomeSections(
  isAnnouncementsHidden: boolean,
  contentStatus: RequestStatus,
  testimonials: Testimonial[],
): readonly NavItem[] {
  const hiddenFragments: string[] = [];
  if (isAnnouncementsHidden) {
    hiddenFragments.push(HomeSection.Announcements);
  }
  const hidesReviews: boolean = isSettledEmpty(contentStatus, testimonials.length);
  if (hidesReviews) {
    hiddenFragments.push(HomeSection.Reviews);
  }
  return HOME_SECTIONS.filter((section: NavItem): boolean => !hiddenFragments.includes(section.fragment));
}

/** The hero's facts row shows the next open time and the rating, so a placeholder holds it until both have answered. */
function toAreHeroFactsLoading(nextTimesStatus: RequestStatus, contentStatus: RequestStatus): boolean {
  return isLoading(nextTimesStatus) || isLoading(contentStatus);
}
