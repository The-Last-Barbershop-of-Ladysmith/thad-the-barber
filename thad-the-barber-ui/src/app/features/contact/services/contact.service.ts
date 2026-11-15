import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ContactReceipt } from '../dtos/contact-receipt.dto';
import { ContactRequest } from '../dtos/contact-request.dto';

export const CONTACT_URL: string = `${environment.apiBaseUrl}/contact`;

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http: HttpClient = inject(HttpClient);

  sendMessage(request: ContactRequest): Observable<ContactReceipt> {
    return this.http.post<ContactReceipt>(CONTACT_URL, request);
  }
}
