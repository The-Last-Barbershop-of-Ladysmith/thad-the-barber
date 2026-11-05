/** What the home page hands the booking page when a visitor taps an open time, in the navigation state. */
export interface BookingPickState {
  /** The open time's UTC instant, picked once the booking page has loaded the days. */
  pickedStartAt?: string;
}
