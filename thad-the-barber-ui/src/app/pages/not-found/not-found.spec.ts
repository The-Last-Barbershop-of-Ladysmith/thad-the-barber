import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import { HOME_SECTIONS, SHOP_FALLBACK } from '../../core/config/shop-info';
import { NavItem } from '../../core/models/shop/nav-item.model';
import * as ShopActions from '../../store/shop/shop.actions';
import { shopFeature } from '../../store/shop/shop.feature';
import { NotFound } from './not-found';

describe(
  'NotFound',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<NotFound> = TestBed.createComponent(NotFound);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function hrefs(element: HTMLElement): string[] {
      return Array.from(element.querySelectorAll('a')).map((link: HTMLAnchorElement): string => link.getAttribute('href') ?? '');
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideStore({ [shopFeature.name]: shopFeature.reducer })],
      });
    });

    it(
      'renders',
      (): void => {
        expect(render().querySelector('[data-testid="not-found"]')).not.toBeNull();
      },
    );

    it(
      'links to booking and the home page',
      (): void => {
        const element: HTMLElement = render();

        expect(element.querySelector('[data-testid="not-found-book"]')?.getAttribute('href')).toBe('/book');
        expect(element.querySelector('[data-testid="not-found-home"]')?.getAttribute('href')).toBe('/');
      },
    );

    it(
      'links to every home section and the fallback phone before the shop loads',
      (): void => {
        const links: string[] = hrefs(render());

        HOME_SECTIONS.forEach((section: NavItem): void => {
          expect(links).toContain(`/#${section.fragment}`);
        });
        expect(links).toContain(`tel:${SHOP_FALLBACK.phone}`);
      },
    );

    it(
      "links to the shop's phone from Square once it loads",
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(hrefs(render())).toContain(`tel:${TEST_SHOP.phone}`);
      },
    );
  },
);
