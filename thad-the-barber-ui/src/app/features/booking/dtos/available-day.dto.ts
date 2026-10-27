/** `GET /api/bookings/availability`: a day in the shop's timezone ("2026-10-03") and its open start times, UTC. */
export interface AvailableDay {
  date: string;
  times: string[];
}
