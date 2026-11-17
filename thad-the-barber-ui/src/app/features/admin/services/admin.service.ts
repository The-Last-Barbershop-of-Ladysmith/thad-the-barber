import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminConfigDto } from '../dtos/admin-config.dto';
import { AdminSessionRequestDto } from '../dtos/admin-session-request.dto';
import { AdminSessionDto } from '../dtos/admin-session.dto';

export const ADMIN_SESSION_URL: string = `${environment.apiBaseUrl}/admin/session`;
export const ADMIN_CONFIG_URL: string = `${environment.apiBaseUrl}/admin/config`;

/** Both calls go with the visitor's session token; the admin token only exists once the first one succeeds. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http: HttpClient = inject(HttpClient);

  getConfig(): Observable<AdminConfigDto> {
    return this.http.get<AdminConfigDto>(ADMIN_CONFIG_URL);
  }

  signIn(idToken: string): Observable<AdminSessionDto> {
    const body: AdminSessionRequestDto = { idToken };
    return this.http.post<AdminSessionDto>(ADMIN_SESSION_URL, body);
  }
}
