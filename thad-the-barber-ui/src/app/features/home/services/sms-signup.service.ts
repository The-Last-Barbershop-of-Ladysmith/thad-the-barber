import { Injectable } from '@angular/core';
import { type Observable, delay, of } from 'rxjs';

/**
 * Text-alert sign-ups. Mocked until an SMS provider is chosen.
 * The real version should POST to `${environment.apiBaseUrl}/sms/subscribe`.
 */
@Injectable({ providedIn: 'root' })
export class SmsSignupService {
  subscribe(phone: string): Observable<{ phone: string; }> {
    return of({ phone }).pipe(delay(400));
  }
}
