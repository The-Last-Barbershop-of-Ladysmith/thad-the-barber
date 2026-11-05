import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { AppState } from '../../../../store/app.state';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import * as HomeActions from '../../state/home.actions';
import { homeFeature } from '../../state/home.feature';
import { NextTimes } from './next-times';

describe(
  'NextTimes',
  (): void => {
    function render(setUp: (store: Store<AppState>) => void): HTMLElement {
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
      setUp(store);
      const fixture: ComponentFixture<NextTimes> = TestBed.createComponent(NextTimes);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it(
      'links each time to the booking page, named by its day and time',
      (): void => {
        const page: HTMLElement = render((store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({
            startAts: ['2026-10-04T05:30:00Z', '2026-10-04T20:00:00Z'],
          }));
        });

        const links: HTMLAnchorElement[] = Array.from(page.querySelectorAll<HTMLAnchorElement>('[data-testid="next-time"]'));

        expect(links.map((link: HTMLAnchorElement): string => link.textContent.replaceAll(/\s+/g, ' ').trim()))
          .toEqual(['Sat, Oct 3 7:30 PM', 'Sun, Oct 4 10:00 AM']);
        expect(links.every((link: HTMLAnchorElement): boolean => link.getAttribute('href') === '/book')).toBe(true);
      },
    );

    it(
      'offers call, text and Square instead when no time is open',
      (): void => {
        const page: HTMLElement = render((store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: [] }));
        });

        const links: string[] = Array.from(page.querySelectorAll<HTMLAnchorElement>('[data-testid="next-times-missing"] a'))
          .map((link: HTMLAnchorElement): string => link.getAttribute('href') ?? '');

        expect(page.querySelector('[data-testid="next-time"]')).toBeNull();
        expect(links).toEqual([
          expect.stringMatching(/^tel:/),
          expect.stringMatching(/^sms:/),
          TEST_SHOP.squareBookingSiteUrl,
        ]);
      },
    );

    it(
      'offers the same when the first load fails',
      (): void => {
        const page: HTMLElement = render((store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestFailure());
        });

        expect(page.querySelector('[data-testid="next-times-missing"]')).not.toBeNull();
      },
    );

    it(
      'keeps the last times after a failed refresh',
      (): void => {
        const page: HTMLElement = render((store: Store<AppState>): void => {
          store.dispatch(HomeActions.NextTimesRequestSuccess({ startAts: ['2026-10-04T20:00:00Z'] }));
          store.dispatch(HomeActions.NextTimesRequestFailure());
        });

        expect(page.querySelectorAll('[data-testid="next-time"]')).toHaveLength(1);
        expect(page.querySelector('[data-testid="next-times-missing"]')).toBeNull();
      },
    );

    it(
      'shows nothing before the first load settles',
      (): void => {
        const page: HTMLElement = render((): void => undefined);

        expect(page.textContent.trim()).toBe('');
      },
    );
  },
);
