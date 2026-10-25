import { SavedConfirmation } from '../models/saved-confirmation.model';
import { BookingState } from '../state/booking.state';

/** BR-22: the confirmation is kept for 24 hours. */
export const KEEP_CONFIRMATION_MS: number = 24 * 60 * 60 * 1000;

/** Kept for 24 hours, or until the appointment starts if that's sooner: after that it can't be changed (BR-07). */
export function isKept(savedConfirmation: SavedConfirmation, now: Date = new Date()): boolean {
  const age: number = now.getTime() - Date.parse(savedConfirmation.savedAt);
  const isFresh: boolean = age < KEEP_CONFIRMATION_MS;
  const hasNotStarted: boolean = Date.parse(savedConfirmation.booking.startAt) > now.getTime();
  return isFresh && hasNotStarted;
}

/**
 * Reads a saved booking slice: only a still-kept `savedConfirmation`, so nothing else stored under the key (an older
 * build's whole slice, a tampered value) reaches the state.
 */
export function toKeptConfirmation(
  saved: unknown,
  now: Date = new Date(),
): Pick<BookingState, 'savedConfirmation'> {
  const candidate: unknown = (saved as { savedConfirmation?: unknown; } | null)?.savedConfirmation;
  const isKeptConfirmation: boolean = isSavedConfirmation(candidate) && isKept(candidate, now);
  if (!isKeptConfirmation) {
    return { savedConfirmation: null };
  }
  return { savedConfirmation: candidate as SavedConfirmation };
}

function isSavedConfirmation(value: unknown): value is SavedConfirmation {
  const confirmation: Partial<SavedConfirmation> | null = value as Partial<SavedConfirmation> | null;
  const hasSavedAt: boolean = typeof confirmation?.savedAt === 'string';
  const hasStartAt: boolean = typeof confirmation?.booking?.startAt === 'string';
  return hasSavedAt && hasStartAt;
}
