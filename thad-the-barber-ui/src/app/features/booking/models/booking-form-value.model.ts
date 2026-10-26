export interface BookingFormValue {
  name: string;
  phone: string;
  date: Date | null;
  /** One of the picked day's UTC start times. */
  startAt: string | null;
}
