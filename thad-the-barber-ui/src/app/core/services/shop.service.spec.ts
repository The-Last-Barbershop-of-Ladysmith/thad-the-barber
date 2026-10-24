import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_SHOP } from '../../../testing/test-shop';
import { environment } from '../../../environments/environment';
import { ShopInfo } from '../models/shop/shop-info.model';
import { ShopService } from './shop.service';

describe(
  'ShopService',
  (): void => {
    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'gets the shop from the API',
      (): void => {
        let shop: ShopInfo | undefined;
        TestBed.inject(ShopService).getShopInfo().subscribe((result: ShopInfo): void => {
          shop = result;
        });

        TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/shop`).flush(TEST_SHOP);

        expect(shop).toEqual(TEST_SHOP);
      },
    );
  },
);
