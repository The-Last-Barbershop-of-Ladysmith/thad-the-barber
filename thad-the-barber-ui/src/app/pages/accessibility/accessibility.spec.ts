import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore } from '@ngrx/store';
import { SHOP_FALLBACK } from '../../core/config/shop-info';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { Accessibility } from './accessibility';

describe(
  'Accessibility',
  (): void => {
    let element: HTMLElement;

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      const fixture: ComponentFixture<Accessibility> = TestBed.createComponent(Accessibility);
      fixture.detectChanges();
      element = fixture.nativeElement as HTMLElement;
    });

    it(
      'shows the statement',
      (): void => {
        expect(element.querySelector('[data-testid="accessibility"]')).not.toBeNull();
      },
    );

    it(
      'links the shop phone so a visitor can ask for help',
      (): void => {
        const href: string | null = element
          .querySelector('[data-testid="accessibility-phone"]')?.getAttribute('href') ?? null;

        expect(href).toBe(`tel:${SHOP_FALLBACK.phone}`);
      },
    );
  },
);
