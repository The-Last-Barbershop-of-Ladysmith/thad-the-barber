import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { FoundBooking } from '../dtos/found-booking.dto';
import { LookupCodeRequest } from '../dtos/lookup-code-request.dto';
import { VerifiedList } from '../dtos/verified-list.dto';
import { VerifiedListRequest } from '../dtos/verified-list-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { RescheduleRequest } from '../dtos/reschedule-request.dto';

export const BOOKINGS_URL: string = `${environment.apiBaseUrl}/bookings`;

/** The manage token goes in this header only, never the URL, so it stays out of server logs (BR-08). */
const LOOKUP_TOKEN_HEADER: string = 'X-Lookup-Token';

const MANAGE_TOKEN_HEADER: string = 'X-Manage-Token';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http: HttpClient = inject(HttpClient);

  createBooking(request: BookingRequest): Observable<BookingConfirmation> {
    return this.http.post<BookingConfirmation>(BOOKINGS_URL, request);
  }

  getBooking(id: string, manageToken: string): Observable<ManagedBooking> {
    return this.http.get<ManagedBooking>(
      this.toBookingUrl(id),
      { headers: { [MANAGE_TOKEN_HEADER]: manageToken } },
    );
  }

  /** Cancelling a booking that's already cancelled returns it as it is, so a retry is safe. */
  cancelBooking(id: string, manageToken: string): Observable<ManagedBooking> {
    return this.http.post<ManagedBooking>(
      `${this.toBookingUrl(id)}/cancel`,
      null,
      { headers: { [MANAGE_TOKEN_HEADER]: manageToken } },
    );
  }

  /** Moving a booking to the time it already has returns it as it is, so a retry is safe. */
  rescheduleBooking(
    id: string,
    manageToken: string,
    request: RescheduleRequest,
  ): Observable<ManagedBooking> {
    return this.http.post<ManagedBooking>(
      `${this.toBookingUrl(id)}/reschedule`,
      request,
      { headers: { [MANAGE_TOKEN_HEADER]: manageToken } },
    );
  }

  sendLookupCode(request: LookupCodeRequest): Observable<null> {
    return this.http.post<null>(`${BOOKINGS_URL}/lookup/code`, request);
  }

  getVerifiedList(request: VerifiedListRequest): Observable<VerifiedList> {
    return this.http.post<VerifiedList>(`${BOOKINGS_URL}/lookup/verified-list`, request);
  }

  refreshVerifiedList(lookupToken: string): Observable<FoundBooking[]> {
    return this.http.get<FoundBooking[]>(
      `${BOOKINGS_URL}/lookup/verified-list`,
      { headers: { [LOOKUP_TOKEN_HEADER]: lookupToken } },
    );
  }

  private toBookingUrl(id: string): string {
    return `${BOOKINGS_URL}/${encodeURIComponent(id)}`;
  }
}
