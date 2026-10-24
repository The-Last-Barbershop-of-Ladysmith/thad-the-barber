import { ShopInfo } from '../app/core/models/shop/shop-info.model';
import { Weekday } from '../app/core/models/shop/weekday.model';

/**
 * A made-up `GET /api/shop` response for unit and e2e tests. Its timezone is Honolulu's (no DST, UTC−10), far from
 * any test machine's, so code that reads the browser's clock instead of the shop's gets the wrong day or hour.
 * Saturday closes at 7:30 PM, so hours that drop the minutes show. The Instagram name needs encoding.
 */
export const TEST_SHOP: ShopInfo = {
  name: 'Made-Up Fades',
  phone: '+15550100142',
  timeZone: 'Pacific/Honolulu',
  squareBookingSiteUrl: 'https://square.example/book/MADE-UP/made-up-fades',
  address: {
    street: '12 Pretend Pl',
    city: 'Faketown',
    state: 'HI',
    postalCode: '96999-0001',
  },
  notice: null,
  instagramUsername: 'made.up fades',
  facebookUrl: 'https://www.facebook.com/made-up-fades',
  hours: [
    {
      day: Weekday.Saturday,
      opens: '10:00:00',
      closes: '19:30:00',
    },
    {
      day: Weekday.Sunday,
      opens: '10:00:00',
      closes: '16:00:00',
    },
  ],
  bookingSettings: {
    minNoticeMinutes: 120,
    maxAdvanceDays: 45,
    slotMinutes: 30,
    canCustomersCancel: true,
  },
};
