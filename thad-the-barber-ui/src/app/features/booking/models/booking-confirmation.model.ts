/** The booked appointment; `manageToken` goes in the manage link (#62). */
export interface BookingConfirmation {
  id: string;
  startAt: string;
  manageToken: string;
}
