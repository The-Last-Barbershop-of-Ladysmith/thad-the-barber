/**
 * `POST /api/bookings`. `startAt` is one of availability's times, sent back unchanged; `phone` is E.164. A retry of
 * the same attempt resends `idempotencyKey`, so a booking whose response was lost isn't made twice.
 */
export interface BookingRequest {
  startAt: string;
  name: string;
  phone: string;
  idempotencyKey: string;
}
