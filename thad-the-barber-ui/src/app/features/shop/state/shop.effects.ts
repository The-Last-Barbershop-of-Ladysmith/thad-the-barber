import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, catchError, exhaustMap, filter, map, of, withLatestFrom } from 'rxjs';
import { ShopInfo } from '../models/shop-info.model';
import { ShopService } from '../services/shop.service';
import { RequestStatus } from '../../../shared/models/request.models';
import { AppState } from '../../../store/app.state';
import * as ShopActions from './shop.actions';
import { shopFeature } from './shop.feature';

/**
 * The first navigation loads the shop, and the next one after a failure tries again. Browser only, like the gallery:
 * the prerendered page shows the fallback name and phone until it loads (#69 prerenders with the shop).
 */
export const requestShopInfoOnNavigation: FunctionalEffect = createEffect(
  (
    router: Router = inject(Router),
    store: Store<AppState> = inject<Store<AppState>>(Store),
    platformId: object = inject(PLATFORM_ID),
  ): Observable<Action> =>
    router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      filter((): boolean => isPlatformBrowser(platformId)),
      withLatestFrom(store.select(shopFeature.selectLoadStatus)),
      filter(([, status]: [NavigationEnd, RequestStatus]): boolean =>
        status === RequestStatus.Idle || status === RequestStatus.Error),
      map((): Action => ShopActions.ShopInfoRequest()),
    ),
  { functional: true },
);

export const loadShopInfo: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    shopService: ShopService = inject(ShopService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(ShopActions.ShopInfoRequest),
      exhaustMap((): Observable<Action> =>
        shopService.getShopInfo().pipe(
          map((shopInfo: ShopInfo): Action => ShopActions.ShopInfoRequestSuccess({ shopInfo })),
          // The failed call itself is in App Insights (browser dependency telemetry, and the API's request log).
          catchError((): Observable<Action> =>
            of(ShopActions.ShopInfoRequestFailure({ error: 'Could not load the shop details.' }))),
        )),
    ),
  { functional: true },
);
