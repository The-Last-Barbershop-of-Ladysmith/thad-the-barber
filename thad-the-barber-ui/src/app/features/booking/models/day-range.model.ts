/** Shop-calendar days ("2026-10-26"), both included: what `GET /api/bookings/availability?from=&to=` asks for. */
export interface DayRange {
  firstDay: string;
  lastDay: string;
}
