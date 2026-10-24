import { ShopInfo } from './shop-info.model';

/**
 * The `ShopInfo` fields shown until `GET /api/shop` answers (so the phone stays reachable while the API is down,
 * BR-14) and on Express's error page. The Square booking URL is never null here: it's the fallback when booking on
 * this site is down.
 */
export interface ShopFallback extends Pick<ShopInfo, 'name' | 'phone'> { squareBookingSiteUrl: string; }
