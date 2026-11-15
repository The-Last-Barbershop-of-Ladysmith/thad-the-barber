import { ContactCategory } from '../models/contact-category.model';
import { ContactPrefill } from '../models/contact-prefill.model';

interface PossiblePrefill {
  category?: unknown;
  pageOrBooking?: unknown;
}

/** The navigation state as a prefill, or null when it isn't one (the page was opened directly). */
export function toContactPrefill(state: unknown): ContactPrefill | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }
  const possiblePrefill: PossiblePrefill = state;
  const category: ContactCategory | undefined = Object.values(ContactCategory)
    .find((knownCategory: ContactCategory): boolean => knownCategory === possiblePrefill.category);
  if (!category || typeof possiblePrefill.pageOrBooking !== 'string') {
    return null;
  }
  return {
    category,
    pageOrBooking: possiblePrefill.pageOrBooking,
  };
}
