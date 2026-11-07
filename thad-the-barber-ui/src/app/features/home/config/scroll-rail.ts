import { NavItem } from '../../../shared/models/nav-item.model';

export const SCROLL_RAIL_SECTIONS: readonly NavItem[] = [
  { label: 'Top', fragment: 'top' },
  { label: 'Next open times', fragment: 'chair' },
  { label: 'Hours', fragment: 'hours' },
  { label: 'Shop news', fragment: 'announcements' },
  { label: 'Gallery', fragment: 'gallery' },
  { label: 'Reviews', fragment: 'reviews' },
  { label: 'Visit', fragment: 'visit' },
];

export const SCROLL_RAIL_CURRENT_LINE: number = 0.4;
