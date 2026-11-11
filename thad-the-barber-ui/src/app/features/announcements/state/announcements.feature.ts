import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { HomeSection } from '../../../shared/models/home-section.model';
import { NavItem } from '../../../shared/models/nav-item.model';
import { Announcement } from '../models/announcement.model';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { currentDateForTimeZone } from '../../../shared/utils/date.utils';
import { isSettledEmpty } from '../../../shared/utils/request.utils';
import { shopFeature } from '../../shop/state/shop.feature';
import { announcementsReducer } from './announcements.reducer';
import { AnnouncementsState } from './announcements.state';

/** Selectors derived from the generated ones; exposed on `announcementsFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AnnouncementsExtraSelectors = {
  selectActive: MemoizedSelector<object, Announcement[]>;
  selectActiveNewestFirst: MemoizedSelector<object, Announcement[]>;
  selectIsHidden: MemoizedSelector<object, boolean>;
  selectHomeSections: MemoizedSelector<object, readonly NavItem[]>;
};

export const announcementsFeatureKey: 'announcements' = 'announcements' as const;

/**
 * The announcements in the media container (#30), registered at bootstrap because the header and footer hide their
 * link on every page when there are none (BR-32). Not saved, so a deleted announcement never comes back from
 * storage; it goes on the next home visit or reload.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const announcementsFeature = createFeature({
  name: announcementsFeatureKey,
  reducer: announcementsReducer,
  extraSelectors: ({
    selectAnnouncements,
    selectLoadStatus,
  }: FeatureSelectors<AnnouncementsState>): AnnouncementsExtraSelectors => {
    const selectActive: MemoizedSelector<object, Announcement[]> = createSelector(
      selectAnnouncements,
      shopFeature.selectTimeZone,
      toActiveAnnouncements,
    );
    const selectIsHidden: MemoizedSelector<object, boolean> = createSelector(
      selectLoadStatus,
      selectActive,
      (loadStatus: RequestStatus, active: Announcement[]): boolean => isSettledEmpty(loadStatus, active.length),
    );
    return {
      selectActive,
      selectActiveNewestFirst: createSelector(
        selectActive,
        toNewestFirst,
      ),
      selectIsHidden,
      selectHomeSections: createSelector(
        selectIsHidden,
        toHomeSections,
      ),
    };
  },
});

/**
 * BR-30: the ones showing today, from the first day through the last, on the shop's calendar. The visitor's date
 * stands in until the shop (and its timezone) first loads.
 */
export function toActiveAnnouncements(announcements: Announcement[], timeZone: string | null): Announcement[] {
  const today: string = currentDateForTimeZone(timeZone);
  return announcements.filter((announcement: Announcement): boolean =>
    announcement.startDate <= today && today <= announcement.endDate);
}

/** By start date, latest first; announcements starting the same day keep the later one in the file first. */
export function toNewestFirst(announcements: Announcement[]): Announcement[] {
  return [...announcements]
    .reverse()
    .sort((first: Announcement, second: Announcement): number => second.startDate.localeCompare(first.startDate));
}

/**
 * The home sections the header, drawer, footer and scroll rail link to: all of them, except the announcements when
 * there are none (BR-32).
 */
export function toHomeSections(isAnnouncementsHidden: boolean): readonly NavItem[] {
  const hiddenFragments: string[] = [];
  if (isAnnouncementsHidden) {
    hiddenFragments.push(HomeSection.Announcements);
  }
  return HOME_SECTIONS.filter((section: NavItem): boolean => !hiddenFragments.includes(section.fragment));
}
