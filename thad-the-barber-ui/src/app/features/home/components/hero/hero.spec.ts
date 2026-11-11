import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import * as ReviewsActions from '../../../reviews/state/reviews.actions';
import { reviewsFeature } from '../../../reviews/state/reviews.feature';
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
            [reviewsFeature.name]: reviewsFeature.reducer,
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
      'holds the place of the pill with a loading pill while the shop loads',
      (): void => {
        vi.useFakeTimers({ now: new Date(SATURDAY_NOON_AT_SHOP), toFake: ['Date'] });
        TestBed.configureTestingModule({
          providers: [
            provideRouter([]),
            provideStore({
              [homeFeature.name]: homeFeature.reducer,
              [reviewsFeature.name]: reviewsFeature.reducer,
              [shopFeature.name]: shopFeature.reducer,
            }),
          ],
        });
        const fixture: ComponentFixture<Hero> = TestBed.createComponent(Hero);
        fixture.detectChanges();
        const heroElement: HTMLElement = fixture.nativeElement as HTMLElement;

        expect(heroElement.querySelector('[data-testid="open-status-loading"]')).not.toBeNull();
        expect(heroElement.querySelector('[data-testid="open-status"]')).toBeNull();
      },
    );

    it(
      'swaps the loading pill for the status once the shop has loaded',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP);

        expect(heroElement.querySelector('[data-testid="open-status-loading"]')).toBeNull();
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
      'holds the place of the open time with a skeleton until the open times load',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP);

        expect(heroElement.querySelector('[data-testid="next-open-chair-loading"]')).not.toBeNull();
      },
    );

    it(
      'drops the skeleton once the open times have loaded',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: ['2026-09-27T20:00:00Z'] }));
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair-loading"]')).toBeNull();
      },
    );

    it(
      'keeps the skeleton while the reviews load, even once the open times are known to be none',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: [] }));
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair-loading"]')).not.toBeNull();
      },
    );

    it(
      'keeps the skeleton while the open times load, even once the reviews have answered',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(ReviewsActions.ReviewsRequestFailure());
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair-loading"]')).not.toBeNull();
      },
    );

    it(
      'keeps the skeleton while the reviews load, even once the open times have answered',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: [] }));
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair-loading"]')).not.toBeNull();
      },
    );

    it(
      'drops the skeleton and shows no open time when loading them fails',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestFailure());
          store.dispatch(ReviewsActions.ReviewsRequestFailure());
        });

        expect(heroElement.querySelector('[data-testid="next-open-chair-loading"]')).toBeNull();
        expect(heroElement.querySelector('[data-testid="next-open-chair"]')).toBeNull();
      },
    );

    it(
      'shows the listing rating once the reviews load, even when no time is open',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP, (store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: [] }));
          store.dispatch(ReviewsActions.ReviewsRequestSuccess({
            testimonials: [],
            rating: {
              score: 4.5,
              count: 12,
              url: null,
            },
          }));
        });

        const rating: string = heroElement.querySelector('[data-testid="hero-rating"]')?.textContent.replace(/\s+/g, ' ') ?? '';
        expect(rating).toContain('4.5');
        expect(rating).toContain('12');
        expect(heroElement.querySelector('[data-testid="next-open-chair"]')).toBeNull();
      },
    );

    it(
      'shows no rating fact when the reviews file has none',
      (): void => {
        const heroElement: HTMLElement = render(SATURDAY_NOON_AT_SHOP);

        expect(heroElement.querySelector('[data-testid="hero-rating"]')).toBeNull();
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
