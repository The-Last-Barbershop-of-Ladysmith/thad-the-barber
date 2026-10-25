import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Event, NavigationEnd, Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action, Store, provideStore } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TEST_SHOP } from '../../../../testing/test-shop';
import { ShopInfo } from '../models/shop-info.model';
import { ShopService } from '../services/shop.service';
import * as ShopActions from './shop.actions';
import { loadShopInfo, requestShopInfoOnNavigation } from './shop.effects';
import { shopFeature } from './shop.feature';

describe(
  'requestShopOnNavigation',
  (): void => {
    let navigations: Subject<Event>;
    let emitted: Action[];

    function start(platform: string): void {
      navigations = new Subject<Event>();
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: Router, useValue: { events: navigations } },
          { provide: PLATFORM_ID, useValue: platform },
        ],
      });
      emitted = [];
      TestBed.runInInjectionContext((): Observable<Action> => requestShopInfoOnNavigation() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
          TestBed.inject(Store).dispatch(action);
        });
    }

    function navigate(url: string): void {
      navigations.next(new NavigationEnd(
        1,
        url,
        url,
      ));
    }

    it(
      'requests the shop on the first navigation',
      (): void => {
        start('browser');

        navigate('/');

        expect(emitted).toEqual([ShopActions.ShopInfoRequest()]);
      },
    );

    it(
      'does not request it again while it loads or once it has loaded',
      (): void => {
        start('browser');
        navigate('/');
        navigate('/book');
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        navigate('/');

        expect(emitted).toEqual([ShopActions.ShopInfoRequest()]);
      },
    );

    it(
      'tries again on the next navigation after a failure',
      (): void => {
        start('browser');
        navigate('/');
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestFailure({ error: 'Could not load the shop details.' }));
        navigate('/book');

        expect(emitted).toEqual([ShopActions.ShopInfoRequest(), ShopActions.ShopInfoRequest()]);
      },
    );

    it(
      'does nothing while prerendering',
      (): void => {
        start('server');

        navigate('/');

        expect(emitted).toEqual([]);
      },
    );
  },
);

describe(
  'loadShop',
  (): void => {
    function run(getShopInfo: () => Observable<ShopInfo>): Action[] {
      const actions$: Subject<Action> = new Subject<Action>();
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: ShopService, useValue: { getShopInfo } },
        ],
      });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => loadShopInfo() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(ShopActions.ShopInfoRequest());
      return emitted;
    }

    it(
      'stores the shop the API returns',
      (): void => {
        const loading: () => Observable<ShopInfo> = (): Observable<ShopInfo> => of(TEST_SHOP);

        expect(run(loading)).toEqual([ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP })]);
      },
    );

    it(
      'reports a failed load',
      (): void => {
        const failing: () => Observable<ShopInfo> = (): Observable<ShopInfo> => throwError((): Error => new Error('503'));

        expect(run(failing)).toEqual([ShopActions.ShopInfoRequestFailure({ error: 'Could not load the shop details.' })]);
      },
    );
  },
);
