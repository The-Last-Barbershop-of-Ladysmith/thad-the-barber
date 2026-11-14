import { Route } from '@playwright/test';
import { AvailableDay } from '../../src/app/features/booking/dtos/available-day.dto';
import { ManagedBooking } from '../../src/app/features/booking/dtos/managed-booking.dto';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { servedEnvironment } from './served-environment';

const AVAILABILITY_URL: string = `${servedEnvironment.apiBaseUrl}/bookings/availability`;
const NEXT_TIMES_URL: string = `${servedEnvironment.apiBaseUrl}/bookings/next`;
const BOOKINGS_URL: string = `${servedEnvironment.apiBaseUrl}/bookings`;

const DAY_MS: number = 86_400_000;

export function isAvailabilityRequest(url: URL): boolean {
  return `${url.origin}${url.pathname}` === AVAILABILITY_URL;
}

export function isNextTimesRequest(url: URL): boolean {
  return `${url.origin}${url.pathname}` === NEXT_TIMES_URL;
}

export function isBookingRequest(url: URL): boolean {
  return url.href === BOOKINGS_URL;
}

export function isLookupStartRequest(url: URL): boolean {
  return `${url.origin}${url.pathname}` === `${BOOKINGS_URL}/lookup/start`;
}

export function isLookupVerifyRequest(url: URL): boolean {
  return `${url.origin}${url.pathname}` === `${BOOKINGS_URL}/lookup/verify`;
}

/** The path segments after `/api/bookings/`: `[id]`, `[id, 'cancel']`…; none for any other URL. */
function toBookingSegments(url: URL): string[] {
  const address: string = `${url.origin}${url.pathname}`;
  const isUnderBookings: boolean = address.startsWith(`${BOOKINGS_URL}/`)
    && !isAvailabilityRequest(url)
    && !isNextTimesRequest(url);
  return isUnderBookings ? address.slice(BOOKINGS_URL.length + 1).split('/') : [];
}

/** `/api/bookings/{id}`, one booking by its ID: not its `/cancel` or `/reschedule`, nor availability. */
export function isManagedBookingRequest(url: URL): boolean {
  return toBookingSegments(url).length === 1;
}

/** `POST /api/bookings/{id}/cancel` or `…/reschedule`, by `action`. */
export function isBookingActionRequest(action: string): (url: URL) => boolean {
  return (url: URL): boolean => {
    const segments: string[] = toBookingSegments(url);
    return segments.length === 2 && segments[1] === action;
  };
}

/** The booking a request names: upcoming and changeable a day from now, unless `changes` say otherwise. */
export function toManagedBooking(route: Route, changes: Partial<ManagedBooking> = {}): ManagedBooking {
  const id: string = decodeURIComponent(toBookingSegments(new URL(route.request().url()))[0] ?? '');
  return {
    id,
    startAt: new Date(Date.now() + DAY_MS).toISOString(),
    isCancelled: false,
    canChange: true,
    ...changes,
  };
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

/** `GET`s any booking by ID as upcoming and still changeable, a day from now; other methods fall through. */
export async function fulfillManagedBooking(route: Route): Promise<void> {
  const isGet: boolean = route.request().method() === 'GET';
  if (!isGet) {
    await route.fallback();
    return;
  }
  await route.fulfill({ json: toManagedBooking(route) });
}

/** Open at 20:00 and 20:30 UTC on each of the next three days, which `toAvailableDays` also has open. */
export async function fulfillNextTimes(route: Route): Promise<void> {
  const count: number = Number(new URL(route.request().url()).searchParams.get('count'));
  const times: string[] = [];
  for (let daysAhead: number = 1; daysAhead <= 3; daysAhead++) {
    const date: string = new Date(Date.now() + daysAhead * DAY_MS).toISOString().slice(0, 10);
    times.push(`${date}T20:00:00Z`, `${date}T20:30:00Z`);
  }
  await route.fulfill({ json: times.slice(0, count) });
}

export async function fulfillAvailability(route: Route): Promise<void> {
  const { searchParams }: URL = new URL(route.request().url());
  await route.fulfill({ json: toAvailableDays(searchParams.get('from') ?? '', searchParams.get('to') ?? '') });
}
