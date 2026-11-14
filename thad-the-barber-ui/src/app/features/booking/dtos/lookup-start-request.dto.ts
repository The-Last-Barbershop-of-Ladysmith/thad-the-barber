/** `POST /api/bookings/lookup/start`; `phone` is E.164. The API answers 202 whether or not the phone has bookings. */
export interface LookupStartRequest {
  phone: string;
}
