import { HttpErrorResponse } from '@angular/common/http';
import { AdminShopError } from '../models/admin-shop-error.model';
import { toAdminShopError, toShopMessage } from './admin-shop-error.utils';

describe('toAdminShopError', (): void => {
  it('reads the API problem code', (): void => {
    const unavailable: HttpErrorResponse = new HttpErrorResponse({ status: 503, error: { code: 'shop_info_unavailable' } });
    const invalid: HttpErrorResponse = new HttpErrorResponse({ status: 400, error: { code: 'validation_failed' } });

    expect(toAdminShopError(unavailable)).toBe(AdminShopError.Unavailable);
    expect(toAdminShopError(invalid)).toBe(AdminShopError.Invalid);
    expect(toAdminShopError(new Error('boom'))).toBe(AdminShopError.Failed);
  });
});

describe('toShopMessage', (): void => {
  it('says something the owner can act on for every error', (): void => {
    for (const error of Object.values(AdminShopError)) {
      expect(toShopMessage(error).length).toBeGreaterThan(20);
    }
  });
});
