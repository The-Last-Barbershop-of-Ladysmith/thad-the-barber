import { FoundBooking } from './found-booking.dto';

export interface VerifiedList {
  bookings: FoundBooking[];
  lookupToken: string;
  expiresAt: string;
}
