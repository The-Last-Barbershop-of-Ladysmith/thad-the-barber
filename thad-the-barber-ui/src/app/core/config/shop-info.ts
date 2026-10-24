import { NavItem } from '../models/shop/nav-item.model';
import { ShopContent } from '../models/shop/shop-content.model';
import { ShopFallback } from '../models/shop/shop-fallback.model';

/** Everything else about the shop comes from Square through the `shop` slice (`store/shop`). */
export const SHOP_FALLBACK: ShopFallback = {
  name: 'Thad The Barber',
  phone: '+15406212143',
  squareBookingSiteUrl: 'https://square.site/book/L36PTJY0KNFV2/thad-the-barber-fredericksburg-va',
};

export const SHOP_CONTENT: ShopContent = {
  reviews: {
    score: 4.9,
    count: 73,
    source: 'Google',
  },
};

/** In-page sections of the home feature, used by the header, mobile drawer and footer. */
export const HOME_SECTIONS: readonly NavItem[] = [
  { label: 'Announcements', fragment: 'announcements' },
  { label: 'Schedule', fragment: 'schedule' },
  { label: 'Visit', fragment: 'visit' },
  { label: 'Testimonials', fragment: 'testimonials' },
  { label: 'Gallery', fragment: 'gallery' },
];
