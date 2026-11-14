import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { NotFound } from './not-found';

describe(
  'NotFound',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<NotFound> = TestBed.createComponent(NotFound);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
        ],
      });
      TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
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
      'links to the Square booking site in a new tab',
      (): void => {
        const link: Element | null = render().querySelector('[data-testid="not-found-square"]');

        expect(link?.getAttribute('href')).toBe(TEST_SHOP.squareBookingSiteUrl);
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toContain('noopener');
      },
    );

    it(
      'moves focus to the heading',
      (): void => {
        const heading: Element | null = render().querySelector('h1');

        expect(heading).not.toBeNull();
        expect(document.activeElement).toBe(heading);
      },
    );
  },
);
