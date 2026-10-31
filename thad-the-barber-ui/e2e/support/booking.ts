import { Route } from '@playwright/test';
import { AvailableDay } from '../../src/app/features/booking/dtos/available-day.dto';
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

/** `GET /api/bookings/{id}`, the manage page's load. */
export function isManagedBookingRequest(url: URL): boolean {
  const isUnderBookings: boolean = `${url.origin}${url.pathname}`.startsWith(`${BOOKINGS_URL}/`);
  return isUnderBookings && !isAvailabilityRequest(url);
}

/**
 * Every day from `from` through `to` that isn't before today on the test shop's clock, so the days in view always have
 * an open day. Each opens at 20:00 and 20:30 UTC, mid-morning on the test shop's Honolulu clock.
 */
function toAvailableDays(from: string, to: string): AvailableDay[] {
  // en-CA writes dates as YYYY-MM-DD; date.utils can't be imported here (it pulls in @angular/common).
  const today: string = new Intl.DateTimeFormat('en-CA', { timeZone: TEST_SHOP.timeZone }).format(new Date());
  const days: AvailableDay[] = [];
  for (
    let day: Date = new Date(`${from}T00:00:00Z`);
    day.toISOString().slice(0, 10) <= to;
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
  const { searchParams }: URL = new URL(route.request().url());
  await route.fulfill({ json: toAvailableDays(searchParams.get('from') ?? '', searchParams.get('to') ?? '') });
}
