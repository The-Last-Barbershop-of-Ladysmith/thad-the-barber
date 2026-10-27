export interface BookingFormValue {
  name: string;
  phone: string;
  /** The picked day on the shop's calendar ("2026-10-27"). */
  date: string | null;
  /** One of the picked day's UTC start times. */
  startAt: string | null;
}
