import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { ShopInfoSaveRequestDto } from '../dtos/shop-info-save-request.dto';

export const ADMIN_SHOP_URL: string = `${environment.apiBaseUrl}/admin/shop`;

/** Both calls go with the admin token (the session interceptor picks it for `/api/admin/*`). */
@Injectable({ providedIn: 'root' })
export class AdminShopService {
  private readonly http: HttpClient = inject(HttpClient);

  get(): Observable<AdminShopInfoDto> {
    return this.http.get<AdminShopInfoDto>(ADMIN_SHOP_URL);
  }

  /** Replaces what was saved; the response is what the page reads back. */
  save(request: ShopInfoSaveRequestDto): Observable<AdminShopInfoDto> {
    return this.http.put<AdminShopInfoDto>(ADMIN_SHOP_URL, request);
  }
}
