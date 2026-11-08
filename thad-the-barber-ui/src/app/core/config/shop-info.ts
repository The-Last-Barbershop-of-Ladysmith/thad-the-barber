import { HomeSection } from '../../shared/models/home-section.model';
import { NavItem } from '../../shared/models/nav-item.model';
import { ShopFallback } from '../models/shop-fallback.model';

/** Everything else about the shop comes from Square through the `shop` slice (`store/shop`). */
export const SHOP_FALLBACK: ShopFallback = {
  name: 'Thad The Barber',
  phone: '+15406212143',
  squareBookingSiteUrl: 'https://square.site/book/L36PTJY0KNFV2/thad-the-barber-fredericksburg-va',
};

/** In-page sections of the home feature, used by the header, mobile drawer and footer. */
export const HOME_SECTIONS: readonly NavItem[] = [
  { label: 'Open times', fragment: HomeSection.OpenTimes },
  { label: 'Hours', fragment: HomeSection.Hours },
  { label: 'Shop news', fragment: HomeSection.Announcements },
  { label: 'Gallery', fragment: HomeSection.Gallery },
  { label: 'Reviews', fragment: HomeSection.Reviews },
  { label: 'Visit', fragment: HomeSection.Visit },
];
