import { createAction, props } from '@ngrx/store';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { ShopInfoSaveRequestDto } from '../dtos/shop-info-save-request.dto';
import { AdminShopError } from '../models/admin-shop-error.model';

export enum AdminShopActionTypes {
  AdminShopRequest = '[Admin Shop] Requested',
  AdminShopRequestSuccess = '[Admin Shop API] Request Success',
  AdminShopRequestFailure = '[Admin Shop API] Request Failed',
  AdminShopSave = '[Admin Shop] Save Requested',
  AdminShopSaveSuccess = '[Admin Shop API] Save Success',
  AdminShopSaveFailure = '[Admin Shop API] Save Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminShopRequest = createAction(
  AdminShopActionTypes.AdminShopRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminShopRequestSuccess = createAction(
  AdminShopActionTypes.AdminShopRequestSuccess,
  props<{ info: AdminShopInfoDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminShopRequestFailure = createAction(
  AdminShopActionTypes.AdminShopRequestFailure,
  props<{ error: AdminShopError; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminShopSave = createAction(
  AdminShopActionTypes.AdminShopSave,
  props<{ request: ShopInfoSaveRequestDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminShopSaveSuccess = createAction(
  AdminShopActionTypes.AdminShopSaveSuccess,
  props<{ info: AdminShopInfoDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AdminShopSaveFailure = createAction(
  AdminShopActionTypes.AdminShopSaveFailure,
  props<{ error: AdminShopError; }>(),
);
