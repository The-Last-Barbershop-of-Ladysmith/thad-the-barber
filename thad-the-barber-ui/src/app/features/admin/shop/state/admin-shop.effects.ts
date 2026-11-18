import { inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { ShopInfoSaveRequestDto } from '../dtos/shop-info-save-request.dto';
import { AdminShopService } from '../services/admin-shop.service';
import { toAdminShopError } from '../utils/admin-shop-error.utils';
import * as AdminShopActions from './admin-shop.actions';

export const loadAdminShop: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminShopService = inject(AdminShopService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminShopActions.AdminShopRequest),
      switchMap((): Observable<Action> =>
        service.get().pipe(
          map((info: AdminShopInfoDto): Action => AdminShopActions.AdminShopRequestSuccess({ info })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminShopActions.AdminShopRequestFailure({ error: toAdminShopError(error) }))),
        )),
    ),
  { functional: true },
);

export const saveAdminShop: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminShopService = inject(AdminShopService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminShopActions.AdminShopSave),
      switchMap(({ request }: { request: ShopInfoSaveRequestDto; }): Observable<Action> =>
        service.save(request).pipe(
          map((info: AdminShopInfoDto): Action => AdminShopActions.AdminShopSaveSuccess({ info })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminShopActions.AdminShopSaveFailure({ error: toAdminShopError(error) }))),
        )),
    ),
  { functional: true },
);
