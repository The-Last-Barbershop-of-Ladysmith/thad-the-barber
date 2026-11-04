import { DateRange } from '../app/features/booking/models/date-range.model';
import { DayRange } from '../app/features/booking/models/day-range.model';
import { toBookingWindow, toMonthRange } from '../app/features/booking/utils/booking-time.utils';
import { TEST_SHOP } from './test-shop';

/** The test shop's booking window on the real clock. */
export function testBookingWindow(): DateRange {
  const bookingWindow: DateRange | null = toBookingWindow(TEST_SHOP.bookingSettings, TEST_SHOP.timeZone);
  if (!bookingWindow) {
    throw new Error('The test shop has a booking window.');
  }
  return bookingWindow;
}

/** The month the booking page opens on for the test shop: this month, on its clock. */
export function testFirstMonth(): DayRange {
  const { min }: DateRange = testBookingWindow();
  return toMonthRange(min.getFullYear(), min.getMonth() + 1);
}

/** A whole calendar month ("2026-11"). */
export function testMonthView(month: string): DayRange {
  const [year, monthNumber]: number[] = month.split('-').map(Number);
  return toMonthRange(year ?? 0, monthNumber ?? 0);
}
