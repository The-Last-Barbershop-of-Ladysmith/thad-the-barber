import { BookingConfirmation } from '../dtos/booking-confirmation.dto';

/** The last booking, kept for 24 hours without the customer's name or phone (BR-22). `savedAt` is ISO. */
export interface SavedConfirmation {
  booking: BookingConfirmation;
  savedAt: string;
}
