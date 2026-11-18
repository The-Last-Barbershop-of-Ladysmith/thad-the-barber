import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ADMIN_SHOP_URL, AdminShopService } from './admin-shop.service';

describe('AdminShopService', (): void => {
  let service: AdminShopService;
  let http: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminShopService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    http.verify();
  });

  it('gets the shop info', (): void => {
    service.get().subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_SHOP_URL);
    expect(request.request.method).toBe('GET');
    request.flush({
      notice: null,
      isNoticeShown: true,
      squareNotice: null,
    });
  });

  it('puts the notice and its switch', (): void => {
    service.save({ notice: 'Closed.', isNoticeShown: false }).subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_SHOP_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ notice: 'Closed.', isNoticeShown: false });
    request.flush({
      notice: 'Closed.',
      isNoticeShown: false,
      squareNotice: null,
    });
  });
});
