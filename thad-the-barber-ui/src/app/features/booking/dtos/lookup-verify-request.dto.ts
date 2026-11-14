/** `POST /api/bookings/lookup/verify`; `code` is the 4 to 10 digits from the text. */
export interface LookupVerifyRequest {
  phone: string;
  code: string;
}
