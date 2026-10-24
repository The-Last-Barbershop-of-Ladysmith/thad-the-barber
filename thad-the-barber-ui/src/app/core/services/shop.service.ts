import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShopInfo } from '../models/shop/shop-info.model';

/** Anonymous on the API, so loading it never asks reCAPTCHA for a session token. */
export const SHOP_URL: string = `${environment.apiBaseUrl}/shop`;

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http: HttpClient = inject(HttpClient);

  getShopInfo(): Observable<ShopInfo> {
    return this.http.get<ShopInfo>(SHOP_URL);
  }
}
