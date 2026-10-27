/**
 * The days the booking page shows: a month ("2026-11"), or with `month` null the 31-day blocks from today on the
 * shop's clock, `upcomingPage` 0 for today on, 1 for the block after, and so on.
 */
export interface AvailabilityView {
  month: string | null;
  upcomingPage: number;
}
