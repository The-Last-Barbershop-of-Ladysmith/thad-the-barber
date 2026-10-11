import { MemoizedSelector, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../core/models/shop.models';
import { AppState } from '../../../store/app.state';
import { Announcement, GalleryPhoto } from '../models/home.models';
import { activeAnnouncements } from './home.feature';

/**
 * The home sections the header and footer link to, without the ones that are hidden for lack of content (BR-32 and the
 * gallery). Reads the slice directly because the layout renders before the home route registers it; until then every
 * link shows.
 */
export const selectHomeSections: MemoizedSelector<AppState, readonly NavItem[]> = createSelector(
  (state: AppState): Announcement[] | undefined => state.home?.announcements,
  (state: AppState): GalleryPhoto[] | undefined => state.home?.gallery,
  (announcements: Announcement[] | undefined, gallery: GalleryPhoto[] | undefined): readonly NavItem[] => {
    if (announcements === undefined || gallery === undefined) {
      return HOME_SECTIONS;
    }
    const hasAnnouncements: boolean = activeAnnouncements(announcements).length > 0;
    return HOME_SECTIONS.filter((section: NavItem): boolean =>
      (section.fragment !== 'announcements' || hasAnnouncements) && (section.fragment !== 'gallery' || gallery.length > 0));
  },
);
