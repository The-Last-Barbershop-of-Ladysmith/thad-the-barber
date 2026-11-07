import { NavItem } from '../../../shared/models/nav-item.model';

export const SCROLL_RAIL_SECTIONS: readonly NavItem[] = [
  { label: 'Top', fragment: 'top' },
  { label: 'Next open times', fragment: 'chair' },
  { label: 'Schedule', fragment: 'schedule' },
  { label: 'Announcements', fragment: 'announcements' },
  { label: 'Gallery', fragment: 'gallery' },
  { label: 'Testimonials', fragment: 'testimonials' },
  { label: 'Visit', fragment: 'visit' },
];

export const SCROLL_RAIL_CURRENT_LINE: number = 0.4;
