import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingState } from '../state/booking.state';

/** Soonest first. */
export function toSortedConfirmations(confirmations: BookingConfirmation[]): BookingConfirmation[] {
  return [...confirmations].sort((first: BookingConfirmation, second: BookingConfirmation): number =>
    Date.parse(first.startAt) - Date.parse(second.startAt));
}

/** The bookings that haven't started, soonest first: one that has can't be changed, so it's dropped (BR-07, BR-22). */
export function toUpcomingConfirmations(
  confirmations: BookingConfirmation[],
  now: Date = new Date(),
): BookingConfirmation[] {
  return toSortedConfirmations(confirmations.filter((confirmation: BookingConfirmation): boolean =>
    Date.parse(confirmation.startAt) > now.getTime()));
}

/**
 * Reads a saved booking slice: only the upcoming bookings' ID, time and manage token, so nothing else stored under the
 * key (an older build's slice, a tampered value, a name or phone) reaches the state.
 */
export function toKeptConfirmations(
  saved: unknown,
  now: Date = new Date(),
): Pick<BookingState, 'savedConfirmations'> {
  const candidates: unknown = (saved as { savedConfirmations?: unknown; } | null)?.savedConfirmations;
  if (!Array.isArray(candidates)) {
    return { savedConfirmations: [] };
  }
  const confirmations: BookingConfirmation[] = candidates
    .filter(isBookingConfirmation)
    .map(({
      id,
      startAt,
      manageToken,
    }: BookingConfirmation): BookingConfirmation => ({
      id,
      startAt,
      manageToken,
    }));
  return { savedConfirmations: toUpcomingConfirmations(confirmations, now) };
}

function isBookingConfirmation(value: unknown): value is BookingConfirmation {
  const confirmation: Partial<BookingConfirmation> | null = value as Partial<BookingConfirmation> | null;
  const hasId: boolean = typeof confirmation?.id === 'string';
  const hasStartAt: boolean = typeof confirmation?.startAt === 'string' && !Number.isNaN(Date.parse(confirmation.startAt));
  const hasManageToken: boolean = typeof confirmation?.manageToken === 'string';
  return hasId && hasStartAt && hasManageToken;
}
