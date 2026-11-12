import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { HomeSection } from '../../../shared/models/home-section.model';
import { NavItem } from '../../../shared/models/nav-item.model';
import { Announcement } from '../models/announcement.model';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { isSettledEmpty } from '../../../shared/utils/request.utils';
import { announcementsReducer } from './announcements.reducer';
import { AnnouncementsState } from './announcements.state';

/** Selectors derived from the generated ones; exposed on `announcementsFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AnnouncementsExtraSelectors = {
  selectNewestFirst: MemoizedSelector<object, Announcement[]>;
  selectIsHidden: MemoizedSelector<object, boolean>;
  selectHomeSections: MemoizedSelector<object, readonly NavItem[]>;
};

export const announcementsFeatureKey: 'announcements' = 'announcements' as const;

/**
 * The announcements `GET /api/announcements` says are showing today (#30, #204), registered at bootstrap because the
 * header and footer hide their link on every page when there are none (BR-32). Not saved, so a deleted announcement
 * never comes back from storage; it goes on the next home visit or reload.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const announcementsFeature = createFeature({
  name: announcementsFeatureKey,
  reducer: announcementsReducer,
  extraSelectors: ({
    selectAnnouncements,
    selectLoadStatus,
  }: FeatureSelectors<AnnouncementsState>): AnnouncementsExtraSelectors => {
    const selectIsHidden: MemoizedSelector<object, boolean> = createSelector(
      selectLoadStatus,
      selectAnnouncements,
      (loadStatus: RequestStatus, announcements: Announcement[]): boolean =>
        isSettledEmpty(loadStatus, announcements.length),
    );
    return {
      selectNewestFirst: createSelector(
        selectAnnouncements,
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
  if (!isAnnouncementsHidden) {
    return HOME_SECTIONS;
  }
  const announcementsFragment: string = HomeSection.Announcements;
  return HOME_SECTIONS.filter((section: NavItem): boolean => section.fragment !== announcementsFragment);
}
