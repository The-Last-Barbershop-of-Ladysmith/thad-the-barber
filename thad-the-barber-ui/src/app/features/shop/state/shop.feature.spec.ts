import { TEST_SHOP } from '../../../../testing/test-shop';
import { SHOP_FALLBACK } from '../../../core/config/shop-info';
import { ShopInfo } from '../models/shop-info.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { shopFeature } from './shop.feature';
import { ShopState, initialShopState } from './shop.state';

describe(
  'shop feature',
  (): void => {
    function root(shopInfo: ShopInfo | null): Record<string, ShopState> {
      return {
        [shopFeature.name]: {
          ...initialShopState,
          shopInfo,
          loadStatus: RequestStatus.Success,
        },
      };
    }

    describe(
      'before the shop loads',
      (): void => {
        const state: Record<string, ShopState> = root(null);

        it(
          'falls back to the copied name, phone and Square booking URL',
          (): void => {
            expect(shopFeature.selectShopName(state)).toBe(SHOP_FALLBACK.name);
            expect(shopFeature.selectPhoneLinks(state)).toEqual({
              display: '(540) 621-2143',
              tel: 'tel:+15406212143',
              sms: 'sms:+15406212143',
            });
            expect(shopFeature.selectBookingUrl(state)).toBe(SHOP_FALLBACK.squareBookingSiteUrl);
          },
        );

        it(
          'has no location, timezone, hours, socials or booking settings',
          (): void => {
            expect(shopFeature.selectAddress(state)).toBeNull();
            expect(shopFeature.selectMapEmbedUrl(state)).toBeNull();
            expect(shopFeature.selectDirectionsUrl(state)).toBeNull();
            expect(shopFeature.selectTimeZone(state)).toBeNull();
            expect(shopFeature.selectOpeningHours(state)).toEqual([]);
            expect(shopFeature.selectSocialLinks(state)).toEqual([]);
            expect(shopFeature.selectBookingSettings(state)).toBeNull();
          },
        );
      },
    );

    describe(
      'once the shop loads',
      (): void => {
        const state: Record<string, ShopState> = root(TEST_SHOP);

        it(
          "uses Square's name and booking URL",
          (): void => {
            expect(shopFeature.selectShopName(state)).toBe('Made-Up Fades');
            expect(shopFeature.selectBookingUrl(state)).toBe('https://square.example/book/MADE-UP/made-up-fades');
          },
        );

        it(
          'formats the E.164 phone and builds its links',
          (): void => {
            expect(shopFeature.selectPhoneLinks(state)).toEqual({
              display: '(555) 010-0142',
              tel: 'tel:+15550100142',
              sms: 'sms:+15550100142',
            });
          },
        );

        it(
          'falls back to the copied booking URL when Square has none',
          (): void => {
            const withoutSite: Record<string, ShopState> = root({ ...TEST_SHOP, squareBookingSiteUrl: null });

            expect(shopFeature.selectBookingUrl(withoutSite)).toBe(SHOP_FALLBACK.squareBookingSiteUrl);
          },
        );

        it(
          'passes the address through and builds encoded map links from it',
          (): void => {
            const query: string = encodeURIComponent('12 Pretend Pl, Faketown, HI 96999-0001');

            expect(shopFeature.selectAddress(state)).toEqual(TEST_SHOP.address);
            expect(shopFeature.selectMapEmbedUrl(state)).toBe(`https://maps.google.com/maps?q=${query}&z=14&output=embed`);
            expect(shopFeature.selectDirectionsUrl(state))
              .toBe(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
          },
        );

        it(
          'passes the opening hours through as Square sends them',
          (): void => {
            expect(shopFeature.selectOpeningHours(state)).toEqual(TEST_SHOP.hours);
          },
        );

        it(
          'links the Instagram name, encoded, and the Facebook page',
          (): void => {
            expect(shopFeature.selectSocialLinks(state).map((link: { href: string; }): string => link.href)).toEqual([
              'https://www.instagram.com/made.up%20fades/',
              'https://www.facebook.com/made-up-fades',
            ]);
          },
        );

        it(
          'leaves out a profile Square has no value for',
          (): void => {
            const instagramOnly: Record<string, ShopState> = root({ ...TEST_SHOP, facebookUrl: null });

            expect(shopFeature.selectSocialLinks(instagramOnly).map((link: { label: string; }): string => link.label))
              .toEqual(['Instagram']);
          },
        );

        it(
          'exposes the timezone and booking settings as Square sends them',
          (): void => {
            expect(shopFeature.selectTimeZone(state)).toBe('Pacific/Honolulu');
            expect(shopFeature.selectBookingSettings(state)).toEqual(TEST_SHOP.bookingSettings);
          },
        );
      },
    );
  },
);
