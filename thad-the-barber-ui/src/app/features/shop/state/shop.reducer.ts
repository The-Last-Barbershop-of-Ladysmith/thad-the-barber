import { ActionReducer, createReducer, on } from '@ngrx/store';
import { ShopInfo } from '../models/shop-info.model';
import { RequestStatus } from '../../../shared/models/request.models';
import * as ShopActions from './shop.actions';
import { ShopState, initialShopState } from './shop.state';

/** A failed load keeps the shop it has, so a saved copy keeps showing while the API is down. */
export const shopReducer: ActionReducer<ShopState> = createReducer(
  initialShopState,
  on(
    ShopActions.ShopInfoRequest,
    (state: ShopState): ShopState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    ShopActions.ShopInfoRequestSuccess,
    (state: ShopState, { shopInfo }: { shopInfo: ShopInfo; }): ShopState => ({
      ...state,
      shopInfo,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    ShopActions.ShopInfoRequestFailure,
    (state: ShopState): ShopState => ({
      ...state,
      loadStatus: RequestStatus.Error,
    }),
  ),
);
