/** A link in the admin menu. `path` is a router path; an item without one isn't built yet and shows as "Soon". */
export interface AdminNavItem {
  label: string;
  icon: string;
  path?: string;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: 'Overview',
    icon: 'pi-home',
    path: '/admin/overview',
  },
  {
    label: 'Announcements',
    icon: 'pi-megaphone',
    path: '/admin/announcements',
  },
  {
    label: 'Gallery',
    icon: 'pi-images',
  },
];

/** The later admin areas: bookings and customers read from Square, then replies to Google reviews. */
export const ADMIN_PLANNED: readonly AdminNavItem[] = [
  {
    label: 'Bookings',
    icon: 'pi-calendar',
  },
  {
    label: 'Customers',
    icon: 'pi-users',
  },
  {
    label: 'Reviews',
    icon: 'pi-star',
  },
];
