import { AvailabilityViewKind } from './availability-view-kind.model';
import { DayRange } from './day-range.model';

/**
 * The days the booking page shows, as shop-calendar days, both included, and how they were picked:
 * `{ kind: Upcoming, firstDay: '2026-11-14', lastDay: '2026-12-14' }` or
 * `{ kind: Month, firstDay: '2026-11-01', lastDay: '2026-11-30' }`. The days go to the API as they are.
 */
export interface AvailabilityView extends DayRange {
  kind: AvailabilityViewKind;
}
