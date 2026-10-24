import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { anonymousRequest } from '../interceptors/anonymous-request.token';
import { ShopInfo } from '../models/shop/shop-info.model';

export const SHOP_URL: string = `${environment.apiBaseUrl}/shop`;

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http: HttpClient = inject(HttpClient);

  /** Anonymous on the API, so loading it never asks reCAPTCHA for a session token. */
  getShopInfo(): Observable<ShopInfo> {
    return this.http.get<ShopInfo>(SHOP_URL, { context: anonymousRequest() });
  }
}
