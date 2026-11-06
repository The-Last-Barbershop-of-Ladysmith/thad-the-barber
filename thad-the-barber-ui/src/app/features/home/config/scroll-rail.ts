import { NavItem } from '../../../shared/models/nav-item.model';

export const SCROLL_RAIL_SECTIONS: readonly NavItem[] = [
  { label: 'Top', fragment: 'top' },
  { label: 'Announcements', fragment: 'announcements' },
  { label: 'Next open times', fragment: 'chair' },
  { label: 'Schedule', fragment: 'schedule' },
  { label: 'Visit', fragment: 'visit' },
  { label: 'Testimonials', fragment: 'testimonials' },
  { label: 'Gallery', fragment: 'gallery' },
];

export const SCROLL_RAIL_CURRENT_LINE: number = 0.4;
