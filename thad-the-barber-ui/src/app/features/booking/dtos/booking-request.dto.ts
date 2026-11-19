/**
 * `POST /api/bookings`. `startAt` is one of availability's times, sent back unchanged; `phone` is E.164. A retry of
 * the same attempt resends `idempotencyKey`, so a booking whose response was lost isn't made twice.
 * `hasTextConsent` is the optional, unticked-by-default choice to get a confirmation text with the manage link and one
 * reminder; `hasMarketingConsent` is the separate choice to also get the shop's news texts.
 */
export interface BookingRequest {
  startAt: string;
  name: string;
  phone: string;
  hasTextConsent: boolean;
  hasMarketingConsent: boolean;
  idempotencyKey: string;
}
