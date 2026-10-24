import { createAction, props } from '@ngrx/store';
import { ShopInfo } from '../../core/models/shop/shop-info.model';

export enum ShopActionTypes {
  ShopInfoRequest = '[Shop] Shop Info Requested',
  ShopInfoRequestSuccess = '[Shop API] Shop Info Request Success',
  ShopInfoRequestFailure = '[Shop API] Shop Info Request Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const ShopInfoRequest = createAction(
  ShopActionTypes.ShopInfoRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const ShopInfoRequestSuccess = createAction(
  ShopActionTypes.ShopInfoRequestSuccess,
  props<{ shopInfo: ShopInfo; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const ShopInfoRequestFailure = createAction(
  ShopActionTypes.ShopInfoRequestFailure,
  props<{ error: string; }>(),
);
