import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_SHOP } from '../../../../testing/test-shop';
import { ShopInfo } from '../models/shop-info.model';
import { SHOP_URL, ShopService } from './shop.service';

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

        TestBed.inject(HttpTestingController).expectOne(SHOP_URL).flush(TEST_SHOP);

        expect(shop).toEqual(TEST_SHOP);
      },
    );
  },
);
