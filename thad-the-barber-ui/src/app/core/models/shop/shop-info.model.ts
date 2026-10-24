import { BookingSettings } from './booking-settings.model';
import { ShopAddress } from './shop-address.model';
import { ShopOpeningHours } from './shop-opening-hours.model';

/** `GET /api/shop`: the shop's details from Square. `phone` is E.164; every time is in `timeZone` (IANA). */
export interface ShopInfo {
  name: string;
  phone: string;
  timeZone: string;
  squareBookingSiteUrl: string | null;
  address: ShopAddress;
  /** The Square location's description, shown as a notice (BR-42). */
  notice: string | null;
  instagramUsername: string | null;
  facebookUrl: string | null;
  hours: ShopOpeningHours[];
  bookingSettings: BookingSettings;
}
