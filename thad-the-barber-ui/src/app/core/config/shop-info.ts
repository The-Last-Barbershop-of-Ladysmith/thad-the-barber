import {
  NavItem,
  OpeningHours,
  ShopInfo,
  SocialLink,
} from '../models/shop.models';

/**
 * Business facts that appear across the header, home sections, booking page and footer.
 * Change them here once instead of in every template.
 */
const address: string = "Jenny's Barber & Beauty Salon, 2022 Augustine Ave, Fredericksburg, VA 22401";

export const SHOP_INFO: ShopInfo = {
  name: 'Thad The Barber',
  tagline: 'Fresh cuts for the whole family.',
  area: 'Route 1 in Fredericksburg',
  phone: {
    display: '(540) 621-2143',
    tel: 'tel:+15406212143',
    sms: 'sms:+15406212143',
  },
  location: {
    venue: "Jenny's Barber & Beauty Salon",
    street: '2022 Augustine Ave',
    cityLine: 'Fredericksburg, VA 22401',
    mapEmbedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
  },
  reviews: {
    score: 4.9,
    count: 73,
    source: 'Google',
  },
};

/** Weekends only. Days not listed are closed. */
export const OPENING_HOURS: readonly OpeningHours[] = [
  {
    day: 6,
    opensAt: 10 * 60,
    closesAt: 19 * 60,
  },
  {
    day: 0,
    opensAt: 10 * 60,
    closesAt: 16 * 60,
  },
];

export const SOCIAL_LINKS: readonly SocialLink[] = [
  // TODO: replace with the shop's real profile URLs.
  {
    label: 'Instagram',
    icon: 'pi pi-instagram',
    href: '#',
  },
  {
    label: 'Facebook',
    icon: 'pi pi-facebook',
    href: '#',
  },
];

/** In-page sections of the home feature, used by the header, mobile drawer and footer. */
export const HOME_SECTIONS: readonly NavItem[] = [
  { label: 'Announcements', fragment: 'announcements' },
  { label: 'Schedule', fragment: 'schedule' },
  { label: 'Visit', fragment: 'visit' },
  { label: 'Testimonials', fragment: 'testimonials' },
  { label: 'Gallery', fragment: 'gallery' },
];
