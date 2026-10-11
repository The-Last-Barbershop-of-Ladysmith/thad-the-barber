import { MemoizedSelector, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../core/models/shop.models';
import { AppState } from '../../../store/app.state';
import { Announcement, GalleryPhoto } from '../models/home.models';
import { activeAnnouncements } from './home.feature';
import { RequestStatus } from './home.state';

/** Hidden only once its load settles with nothing to show, so prerendered pages and loading states keep the link. */
function isSettledEmpty(status: RequestStatus | undefined, count: number): boolean {
  return status === 'error' || (status === 'success' && count === 0);
}

/**
 * The home sections the header and footer link to, without the ones whose content turned out empty or failed to load
 * (BR-32 and the gallery). Reads the slice directly because the layout renders before the home route registers it.
 */
export const selectHomeSections: MemoizedSelector<AppState, readonly NavItem[]> = createSelector(
  (state: AppState): RequestStatus | undefined => state.home?.announcementsStatus,
  (state: AppState): Announcement[] | undefined => state.home?.announcements,
  (state: AppState): RequestStatus | undefined => state.home?.galleryStatus,
  (state: AppState): GalleryPhoto[] | undefined => state.home?.gallery,
  (
    announcementsStatus: RequestStatus | undefined,
    announcements: Announcement[] | undefined,
    galleryStatus: RequestStatus | undefined,
    gallery: GalleryPhoto[] | undefined,
  ): readonly NavItem[] => {
    const hidesAnnouncements: boolean = isSettledEmpty(
      announcementsStatus,
      activeAnnouncements(announcements ?? []).length,
    );
    const hidesGallery: boolean = isSettledEmpty(galleryStatus, gallery?.length ?? 0);
    return HOME_SECTIONS.filter((section: NavItem): boolean =>
      !(section.fragment === 'announcements' && hidesAnnouncements) && !(section.fragment === 'gallery' && hidesGallery));
  },
);
