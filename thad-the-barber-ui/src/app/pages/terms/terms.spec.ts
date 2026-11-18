import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { LegalSection } from '../../shared/models/legal-section.model';
import { Terms } from './terms';
import { TERMS_SECTIONS } from './terms-sections';

describe(
  'Terms',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<Terms> = TestBed.createComponent(Terms);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideStore({ [shopFeature.name]: shopFeature.reducer })],
      });
    });

    it(
      'renders every section under its own id',
      (): void => {
        const element: HTMLElement = render();

        TERMS_SECTIONS.forEach((section: LegalSection): void => {
          expect(element.querySelector(`#${section.fragment}`)).not.toBeNull();
          expect(element.querySelector(`[data-testid="terms-section-${section.fragment}"]`)).not.toBeNull();
        });
      },
    );

    it(
      'lists the same sections in the contents',
      (): void => {
        const links: HTMLAnchorElement[] = Array.from(
          render().querySelectorAll<HTMLAnchorElement>('[data-testid="terms-toc"] a'),
        );

        expect(links.map((link: HTMLAnchorElement): string => link.textContent.trim()))
          .toEqual(TERMS_SECTIONS.map((section: LegalSection): string => section.label));
      },
    );

    it(
      "gives the sections that name the shop its name, and the booking texts section the Square phone",
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        const element: HTMLElement = render();

        ['using', 'shop-news-texts'].forEach((fragment: string): void => {
          expect(element.querySelector(`[data-testid="terms-section-${fragment}"]`)?.textContent)
            .toContain(TEST_SHOP.name);
        });
        expect(element.querySelector('[data-testid="terms-section-booking-texts"] a')?.getAttribute('href'))
          .toBe(`tel:${TEST_SHOP.phone}`);
      },
    );

    it(
      'says STOP and HELP work for both kinds of text, and that shop news is never needed to book',
      (): void => {
        const text: string = render().textContent;

        expect(text).toContain('Reply STOP');
        expect(text).toContain('HELP');
        expect(text).toContain('never needed to book');
      },
    );
  },
);
