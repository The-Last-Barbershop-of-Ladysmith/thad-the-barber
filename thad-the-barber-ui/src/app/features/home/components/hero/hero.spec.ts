import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import * as HomeActions from '../../state/home.actions';
import { homeFeature } from '../../state/home.feature';
import { Hero } from './hero';

describe(
  'Hero',
  (): void => {
    const SATURDAY_NOON_AT_SHOP: string = '2026-09-26T22:00:00Z';
    const MONDAY_NOON_AT_SHOP: string = '2026-09-28T22:00:00Z';

    function render(now: string, setUp?: (store: Store<AppState>) => void): HTMLElement {
      vi.useFakeTimers({ now: new Date(now), toFake: ['Date'] });
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({
            [homeFeature.name]: homeFeature.reducer,
            [shopFeature.name]: shopFeature.reducer,
          }),
        ],
      });
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      setUp?.(store);
      const fixture: ComponentFixture<Hero> = TestBed.createComponent(Hero);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'has the page heading, once',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP);

        expect(heroElement.querySelectorAll('h1')).toHaveLength(1);
      },
    );

    it(
      'sends the booking button to the booking page',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP);

        expect(heroElement.querySelector('a[href="/book"]')).not.toBeNull();
      },
    );

    it(
      "links the call button to the shop's phone from the store",
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP);

        expect(heroElement.querySelector('[data-testid="hero-call"]')?.getAttribute('href')).toContain('+15550100142');
      },
    );

    it(
      'marks the status as open with the closing time while the shop is open',
      (): void => {
        const status: Element | null = render(SATURDAY_NOON_AT_SHOP).querySelector('[data-testid="open-status"]');

        expect(status?.classList.contains('open')).toBe(true);
        expect(status?.textContent).toContain('closes 7:30 PM');
      },
    );

    it(
      'does not mark the status as open while the shop is closed',
      (): void => {
        const status: Element | null = render(MONDAY_NOON_AT_SHOP).querySelector('[data-testid="open-status"]');

        expect(status?.classList.contains('open')).toBe(false);
        expect(status?.textContent).toContain('Opens Sat 10 AM');
      },
    );

    it(
      'shows the first open time',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: ['2026-09-27T20:00:00Z'] }));
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair"]')?.textContent).toMatch(/\d/);
      },
    );

    it(
      'hides the open time when none is open',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: [] }));
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair"]')).toBeNull();
      },
    );
  },
);
