import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';

export const BOOKINGS_URL: string = `${environment.apiBaseUrl}/bookings`;

/** The manage token goes in this header only, never the URL, so it stays out of server logs (BR-08). */
const MANAGE_TOKEN_HEADER: string = 'X-Manage-Token';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http: HttpClient = inject(HttpClient);

  createBooking(request: BookingRequest): Observable<BookingConfirmation> {
    return this.http.post<BookingConfirmation>(BOOKINGS_URL, request);
  }

  getBooking(id: string, manageToken: string): Observable<ManagedBooking> {
    return this.http.get<ManagedBooking>(
      `${BOOKINGS_URL}/${encodeURIComponent(id)}`,
      { headers: { [MANAGE_TOKEN_HEADER]: manageToken } },
    );
  }
}
