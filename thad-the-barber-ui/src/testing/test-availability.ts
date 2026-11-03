import { toIsoDate } from '../app/shared/utils/date.utils';
import { AvailabilityViewKind } from '../app/features/booking/models/availability-view-kind.model';
import { AvailabilityView } from '../app/features/booking/models/availability-view.model';
import { DateRange } from '../app/features/booking/models/date-range.model';
import { toBookingWindow, toUpcomingView } from '../app/features/booking/utils/booking-time.utils';
import { TEST_SHOP } from './test-shop';

/** The test shop's booking window on the real clock. */
export function testBookingWindow(): DateRange {
  const bookingWindow: DateRange | null = toBookingWindow(TEST_SHOP.bookingSettings, TEST_SHOP.timeZone);
  if (!bookingWindow) {
    throw new Error('The test shop has a booking window.');
  }
  return bookingWindow;
}

/** The view the booking page opens on for the test shop: today's 31-day block, on its clock. */
export function testFirstBlock(): AvailabilityView {
  const bookingWindow: DateRange = testBookingWindow();
  return toUpcomingView(bookingWindow.min, bookingWindow);
}

/** A whole calendar month ("2026-11"), its 1st through its last day. */
export function testMonthView(month: string): AvailabilityView {
  const [year, monthNumber]: number[] = month.split('-').map(Number);
  return {
    kind: AvailabilityViewKind.Month,
    firstDay: `${month}-01`,
    lastDay: toIsoDate(new Date(
      year ?? 0,
      monthNumber ?? 0,
      0,
    )),
  };
}
