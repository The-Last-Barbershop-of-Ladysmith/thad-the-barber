import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import { SHOP_FALLBACK } from '../../core/config/shop-info';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { Privacy } from './privacy';

describe(
  'Privacy',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<Privacy> = TestBed.createComponent(Privacy);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function phoneHref(element: HTMLElement): string | null {
      return element.querySelector('[data-testid="privacy-phone"]')?.getAttribute('href') ?? null;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })],
      });
    });

    it(
      'gives the fallback phone before the shop loads',
      (): void => {
        expect(phoneHref(render())).toBe(`tel:${SHOP_FALLBACK.phone}`);
      },
    );

    it(
      "gives the shop's phone from Square once it loads",
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(phoneHref(render())).toBe(`tel:${TEST_SHOP.phone}`);
      },
    );

    it(
      "links to Google's privacy policy and terms for the bot check",
      (): void => {
        const hrefs: string[] = Array.from(render().querySelectorAll('a'))
          .map((link: HTMLAnchorElement): string => link.getAttribute('href') ?? '');

        expect(hrefs).toContain('https://policies.google.com/privacy');
        expect(hrefs).toContain('https://policies.google.com/terms');
      },
    );
  },
);
