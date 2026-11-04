/** `POST /api/bookings/{id}/reschedule`: the new time, one of availability's `startAt`s sent back unchanged. */
export interface RescheduleRequest {
  startAt: string;
}
