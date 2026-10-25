import { Route } from '@playwright/test';
import { AvailableDay } from '../../src/app/features/booking/models/available-day.model';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { servedEnvironment } from './served-environment';

const AVAILABILITY_URL: string = `${servedEnvironment.apiBaseUrl}/bookings/availability`;
const BOOKINGS_URL: string = `${servedEnvironment.apiBaseUrl}/bookings`;

const DAY_MS: number = 86_400_000;

export function isAvailabilityRequest(url: URL): boolean {
  return `${url.origin}${url.pathname}` === AVAILABILITY_URL;
}

export function isBookingRequest(url: URL): boolean {
  return url.href === BOOKINGS_URL;
}

/**
 * Every day of the month from today on the test shop's clock, so the month in view always has an open day, even on its
 * last. Each opens at 20:00 and 20:30 UTC, mid-morning on the test shop's Honolulu clock.
 */
function toAvailableDays(month: string): AvailableDay[] {
  // en-CA writes dates as YYYY-MM-DD; date.utils can't be imported here (it pulls in @angular/common).
  const today: string = new Intl.DateTimeFormat('en-CA', { timeZone: TEST_SHOP.timeZone }).format(new Date());
  const days: AvailableDay[] = [];
  for (
    let day: Date = new Date(`${month}-01T00:00:00Z`);
    day.toISOString().startsWith(month);
    day = new Date(day.getTime() + DAY_MS)
  ) {
    const date: string = day.toISOString().slice(0, 10);
    if (date >= today) {
      days.push({ date, times: [`${date}T20:00:00Z`, `${date}T20:30:00Z`] });
    }
  }
  return days;
}

export async function fulfillAvailability(route: Route): Promise<void> {
  const month: string = new URL(route.request().url()).searchParams.get('month') ?? '';
  await route.fulfill({ json: toAvailableDays(month) });
}
