import { Injectable } from '@angular/core';
import { type Observable, delay, of } from 'rxjs';
import { type BookingConfirmation, type BookingRequest } from '../models/booking.models';

/**
 * Creates appointments. Mocked until the booking API exists;
 * the real version should POST to `apiUrl('/bookings')`.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  create(request: BookingRequest): Observable<BookingConfirmation> {
    return of({
      ...request,
      id: crypto.randomUUID(),
    }).pipe(delay(500));
  }
}
