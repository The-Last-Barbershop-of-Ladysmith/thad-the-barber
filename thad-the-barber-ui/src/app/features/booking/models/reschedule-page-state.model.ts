/**
 * What a booking's page hands the booking page when it opens it to reschedule, in the navigation state (never the
 * URL); the router restores it on a reload.
 */
export interface ReschedulePageState {
  manageToken?: string;
  /** The booking's current start, shown next to the new one. */
  startAt?: string;
}
