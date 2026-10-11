import { MemoizedSelector, createSelector } from '@ngrx/store';
import { HOME_SECTIONS } from '../../../core/config/shop-info';
import { NavItem } from '../../../core/models/shop.models';
import { AppState } from '../../../store/app.state';
import { activeAnnouncements } from './home.feature';
import { HomeState } from './home.state';

/**
 * The home sections the header and footer link to, without the ones that are hidden for lack of content (BR-32 and the
 * gallery). Reads the slice directly because the layout renders before the home route registers it; until then every
 * link shows.
 */
export const selectHomeSections: MemoizedSelector<AppState, readonly NavItem[]> = createSelector(
  (state: AppState): HomeState | undefined => state.home,
  (home: HomeState | undefined): readonly NavItem[] => {
    if (home === undefined) {
      return HOME_SECTIONS;
    }
    const hiddenSections: Set<string> = new Set<string>();
    if (activeAnnouncements(home.announcements).length === 0) {
      hiddenSections.add('announcements');
    }
    if (home.gallery.length === 0) {
      hiddenSections.add('gallery');
    }
    return HOME_SECTIONS.filter((section: NavItem): boolean => !hiddenSections.has(section.fragment));
  },
);
