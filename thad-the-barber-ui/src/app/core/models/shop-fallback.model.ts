import { ShopInfo } from '../../features/shop/models/shop-info.model';

/**
 * The `ShopInfo` fields shown until `GET /api/shop` answers (so the phone stays reachable while the API is down,
 * BR-14) and on Express's error page. The Square booking URL is never null here: it's the fallback when booking on
 * this site is down. `city` is for search-result titles and descriptions, which are prerendered before any API data
 * exists; it is edited by hand, like the rest of the fallback.
 */
export interface ShopFallback extends Pick<ShopInfo, 'name' | 'phone'> {
  squareBookingSiteUrl: string;
  city: string;
}
