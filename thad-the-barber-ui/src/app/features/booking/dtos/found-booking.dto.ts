/** An upcoming booking for a verified phone, soonest first; `manageToken` goes in the manage link. */
export interface FoundBooking {
  id: string;
  startAt: string;
  manageToken: string;
}
