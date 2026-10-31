/**
 * `GET /api/bookings/{id}`: the booking seen through its manage link, with nothing about the customer (BR-20).
 * `canChange` is false once it's cancelled or its start time has passed, by the server's clock (BR-07).
 */
export interface ManagedBooking {
  id: string;
  startAt: string;
  isCancelled: boolean;
  canChange: boolean;
}
