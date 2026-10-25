import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { Announcement } from '../models/announcement.model';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { RequestStatus } from '../../../shared/models/request.models';
import { toIsoDate, toIsoDateIn } from '../../../shared/utils/date.utils';
import { isSettledEmpty } from '../../../shared/utils/request.utils';
import { shopFeature } from '../../shop/state/shop.feature';
import { announcementsReducer } from './announcements.reducer';
import { AnnouncementsState } from './announcements.state';

/** Selectors derived from the generated ones; exposed on `announcementsFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AnnouncementsExtraSelectors = {
  selectActive: MemoizedSelector<object, Announcement[]>;
  selectIsHidden: MemoizedSelector<object, boolean>;
};

export const announcementsFeatureKey: 'announcements' = 'announcements' as const;

/**
 * The announcements in the media container (#30), registered at bootstrap because the header and footer hide their
 * link on every page when there are none (BR-32). Not saved: a deleted announcement must never show again.
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
    return {
      selectActive,
      selectIsHidden: createSelector(
        selectLoadStatus,
        selectActive,
        (loadStatus: RequestStatus, active: Announcement[]): boolean => isSettledEmpty(loadStatus, active.length),
      ),
    };
  },
});

/** BR-30: the ones showing today, from the first day through the last, on the shop's calendar. */
export function toActiveAnnouncements(announcements: Announcement[], timeZone: string | null): Announcement[] {
  const today: string = toShopToday(timeZone);
  return announcements.filter((announcement: Announcement): boolean =>
    announcement.startDate <= today && today <= announcement.endDate);
}

/** The visitor's date stands in until the shop (and its timezone) first loads. */
function toShopToday(timeZone: string | null): string {
  const now: Date = new Date();
  if (timeZone === null) {
    return toIsoDate(now);
  }
  return toIsoDateIn(timeZone, now);
}
