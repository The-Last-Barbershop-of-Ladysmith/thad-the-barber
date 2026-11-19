import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TextUpdatesSignUpRequest } from '../dtos/text-updates-sign-up-request.dto';

export const TEXT_UPDATES_SIGN_UP_URL: string = `${environment.apiBaseUrl}/marketing-texts/opt-ins`;

@Injectable({ providedIn: 'root' })
export class SmsSignupService {
  private readonly http: HttpClient = inject(HttpClient);

  // The form only submits once the customer has ticked the consent box.
  subscribe(phone: string): Observable<null> {
    const request: TextUpdatesSignUpRequest = { phone, hasConsent: true };
    return this.http.post<null>(TEXT_UPDATES_SIGN_UP_URL, request);
  }
}
