import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { SHOP_FALLBACK } from '../../core/config/shop-info';
import { BookingSettings } from '../../core/models/shop/booking-settings.model';
import { PhoneLinks } from '../../core/models/shop/phone-links.model';
import { ShopAddress } from '../../core/models/shop/shop-address.model';
import { ShopInfo } from '../../core/models/shop/shop-info.model';
import { ShopOpeningHours } from '../../core/models/shop/shop-opening-hours.model';
import { SocialLink } from '../../core/models/shop/social-link.model';
import { FeatureSelectors } from '../../shared/models/ngrx.models';
import { toPhoneLinks } from '../../shared/utils/phone.utils';
import { shopReducer } from './shop.reducer';
import { ShopState } from './shop.state';

/** Selectors derived from the generated ones; exposed on `shopFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type ShopExtraSelectors = {
  selectShopName: MemoizedSelector<object, string>;
  selectPhoneLinks: MemoizedSelector<object, PhoneLinks>;
  selectBookingUrl: MemoizedSelector<object, string>;
  selectAddress: MemoizedSelector<object, ShopAddress | null>;
  selectMapEmbedUrl: MemoizedSelector<object, string | null>;
  selectDirectionsUrl: MemoizedSelector<object, string | null>;
  selectTimeZone: MemoizedSelector<object, string | null>;
  selectOpeningHours: MemoizedSelector<object, ShopOpeningHours[]>;
  selectSocialLinks: MemoizedSelector<object, SocialLink[]>;
  selectBookingSettings: MemoizedSelector<object, BookingSettings | null>;
};

/** Store key for this slice; also names its localStorage entry (`ttb-shop`). */
export const shopFeatureKey: 'shop' = 'shop' as const;

/**
 * The shop's details from `GET /api/shop`, registered at bootstrap because the header and footer show them on every
 * page. Until the shop loads, the name, phone and Square booking URL come from `SHOP_FALLBACK`, and the rest is empty.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const shopFeature = createFeature({
  name: shopFeatureKey,
  reducer: shopReducer,
  extraSelectors: ({ selectShopInfo }: FeatureSelectors<ShopState>): ShopExtraSelectors => ({
    selectShopName: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): string => (shopInfo ?? SHOP_FALLBACK).name,
    ),
    selectPhoneLinks: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): PhoneLinks => toPhoneLinks((shopInfo ?? SHOP_FALLBACK).phone),
    ),
    selectBookingUrl: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): string => shopInfo?.squareBookingSiteUrl ?? SHOP_FALLBACK.squareBookingSiteUrl,
    ),
    selectAddress: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): ShopAddress | null => shopInfo?.address ?? null,
    ),
    selectMapEmbedUrl: createSelector(
      selectShopInfo,
      toMapEmbedUrl,
    ),
    selectDirectionsUrl: createSelector(
      selectShopInfo,
      toDirectionsUrl,
    ),
    selectTimeZone: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): string | null => shopInfo?.timeZone ?? null,
    ),
    selectOpeningHours: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): ShopOpeningHours[] => shopInfo?.hours ?? [],
    ),
    selectSocialLinks: createSelector(
      selectShopInfo,
      toSocialLinks,
    ),
    selectBookingSettings: createSelector(
      selectShopInfo,
      (shopInfo: ShopInfo | null): BookingSettings | null => shopInfo?.bookingSettings ?? null,
    ),
  }),
});

function toMapEmbedUrl(shopInfo: ShopInfo | null): string | null {
  if (!shopInfo) {
    return null;
  }
  return `https://maps.google.com/maps?q=${toMapQuery(shopInfo.address)}&z=14&output=embed`;
}

function toDirectionsUrl(shopInfo: ShopInfo | null): string | null {
  if (!shopInfo) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${toMapQuery(shopInfo.address)}`;
}

/** "12 Pretend Pl, Faketown, HI 96999-0001", encoded for a Google Maps query. */
function toMapQuery({
  street,
  city,
  state,
  postalCode,
}: ShopAddress): string {
  return encodeURIComponent(`${street}, ${city}, ${state} ${postalCode}`);
}

/** Only the profiles Square has. */
function toSocialLinks(shopInfo: ShopInfo | null): SocialLink[] {
  const links: SocialLink[] = [];
  if (shopInfo?.instagramUsername) {
    links.push({
      label: 'Instagram',
      icon: 'pi pi-instagram',
      href: `https://www.instagram.com/${encodeURIComponent(shopInfo.instagramUsername)}/`,
    });
  }
  if (shopInfo?.facebookUrl) {
    links.push({
      label: 'Facebook',
      icon: 'pi pi-facebook',
      href: shopInfo.facebookUrl,
    });
  }
  return links;
}
