import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../shared/models/nav-item.model';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { isSettledEmpty } from '../../../shared/utils/request.utils';
import { announcementsFeature } from '../../../store/announcements/announcements.feature';
import { GalleryPhoto } from '../models/home.models';
import { homeReducer } from './home.reducer';
import { HomeState, SmsSignupState } from './home.state';

/** Selectors derived from the generated ones; exposed on `homeFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type HomeExtraSelectors = {
  selectIsSubscribedToSms: MemoizedSelector<object, boolean>;
  selectIsSubscribingSms: MemoizedSelector<object, boolean>;
  selectIsContentLoading: MemoizedSelector<object, boolean>;
  selectHomeSections: MemoizedSelector<object, readonly NavItem[]>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-home`). */
export const homeFeatureKey: 'home' = 'home' as const;

/**
 * The home page's content (testimonials, gallery) and the SMS signup, registered at bootstrap because the header and
 * footer link to its sections on every page. Its effects still register with the home route.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: homeFeatureKey,
  reducer: homeReducer,
  extraSelectors: ({
    selectSmsSignup,
    selectContentStatus,
    selectGallery,
    selectGalleryStatus,
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
      selectGalleryStatus,
      selectGallery,
      toHomeSections,
    ),
  }),
});

/**
 * The home sections the header and footer link to, without the ones whose content turned out empty or failed to load
 * (BR-32 and the gallery).
 */
function toHomeSections(
  isAnnouncementsHidden: boolean,
  galleryStatus: RequestStatus,
  gallery: GalleryPhoto[],
): readonly NavItem[] {
  const hidesGallery: boolean = isSettledEmpty(galleryStatus, gallery.length);
  return HOME_SECTIONS.filter((section: NavItem): boolean => {
    const isHiddenAnnouncements: boolean = section.fragment === 'announcements' && isAnnouncementsHidden;
    const isHiddenGallery: boolean = section.fragment === 'gallery' && hidesGallery;
    return !isHiddenAnnouncements && !isHiddenGallery;
  });
}
