import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../shared/models/nav-item.model';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { toIsoDate } from '../../../shared/utils/date.utils';
import { Announcement, GalleryPhoto } from '../models/home.models';
import { homeReducer } from './home.reducer';
import { HomeState, SmsSignupState } from './home.state';

/** Selectors derived from the generated ones; exposed on `homeFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type HomeExtraSelectors = {
  selectIsSubscribedToSms: MemoizedSelector<object, boolean>;
  selectIsSubscribingSms: MemoizedSelector<object, boolean>;
  selectIsContentLoading: MemoizedSelector<object, boolean>;
  selectActiveAnnouncements: MemoizedSelector<object, Announcement[]>;
  selectHomeSections: MemoizedSelector<object, readonly NavItem[]>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-home`). */
export const homeFeatureKey: 'home' = 'home' as const;

/**
 * The home page's content (announcements, testimonials, gallery) and the SMS signup, registered at bootstrap because
 * the header and footer link to its sections on every page. Its effects still register with the home route.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const homeFeature = createFeature({
  name: homeFeatureKey,
  reducer: homeReducer,
  extraSelectors: ({
    selectSmsSignup,
    selectContentStatus,
    selectAnnouncements,
    selectAnnouncementsStatus,
    selectGallery,
    selectGalleryStatus,
  }: FeatureSelectors<HomeState>): HomeExtraSelectors => {
    const selectActiveAnnouncements: MemoizedSelector<object, Announcement[]> = createSelector(
      selectAnnouncements,
      toActiveAnnouncements,
    );
    return {
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
      selectActiveAnnouncements,
      selectHomeSections: createSelector(
        selectAnnouncementsStatus,
        selectActiveAnnouncements,
        selectGalleryStatus,
        selectGallery,
        toHomeSections,
      ),
    };
  },
});

/** BR-30: the ones showing today, from the first day through the last, by the visitor's local date. */
export function toActiveAnnouncements(announcements: Announcement[]): Announcement[] {
  const today: string = toIsoDate(new Date());
  return announcements.filter((announcement: Announcement): boolean =>
    announcement.startDate <= today && today <= announcement.endDate);
}

/**
 * The home sections the header and footer link to, without the ones whose content turned out empty or failed to load
 * (BR-32 and the gallery).
 */
function toHomeSections(
  announcementsStatus: RequestStatus,
  activeAnnouncements: Announcement[],
  galleryStatus: RequestStatus,
  gallery: GalleryPhoto[],
): readonly NavItem[] {
  const hidesAnnouncements: boolean = isSettledEmpty(announcementsStatus, activeAnnouncements.length);
  const hidesGallery: boolean = isSettledEmpty(galleryStatus, gallery.length);
  return HOME_SECTIONS.filter((section: NavItem): boolean => {
    const isHiddenAnnouncements: boolean = section.fragment === 'announcements' && hidesAnnouncements;
    const isHiddenGallery: boolean = section.fragment === 'gallery' && hidesGallery;
    return !isHiddenAnnouncements && !isHiddenGallery;
  });
}

/** Hidden only once its load settles with nothing to show, so prerendered pages and loading states keep the link. */
function isSettledEmpty(status: RequestStatus, count: number): boolean {
  const isFailed: boolean = status === RequestStatus.Error;
  const isLoadedEmpty: boolean = status === RequestStatus.Success && count === 0;
  return isFailed || isLoadedEmpty;
}
