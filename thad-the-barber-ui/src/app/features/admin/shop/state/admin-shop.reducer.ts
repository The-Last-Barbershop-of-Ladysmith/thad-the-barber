import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../../shared/models/request.models';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { AdminShopError } from '../models/admin-shop-error.model';
import * as AdminShopActions from './admin-shop.actions';
import { AdminShopState, initialAdminShopState } from './admin-shop.state';

export const adminShopReducer: ActionReducer<AdminShopState> = createReducer(
  initialAdminShopState,
  on(
    AdminShopActions.AdminShopRequest,
    (state: AdminShopState): AdminShopState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
      saveStatus: RequestStatus.Idle,
      error: null,
    }),
  ),
  on(
    AdminShopActions.AdminShopRequestSuccess,
    (state: AdminShopState, { info }: { info: AdminShopInfoDto; }): AdminShopState => ({
      ...state,
      info,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminShopActions.AdminShopRequestFailure,
    (state: AdminShopState, { error }: { error: AdminShopError; }): AdminShopState => ({
      ...state,
      loadStatus: RequestStatus.Error,
      error,
    }),
  ),
  on(
    AdminShopActions.AdminShopSave,
    (state: AdminShopState): AdminShopState => ({
      ...state,
      saveStatus: RequestStatus.Pending,
      error: null,
    }),
  ),
  on(
    AdminShopActions.AdminShopSaveSuccess,
    (state: AdminShopState, { info }: { info: AdminShopInfoDto; }): AdminShopState => ({
      ...state,
      info,
      saveStatus: RequestStatus.Success,
    }),
  ),
  on(
    AdminShopActions.AdminShopSaveFailure,
    (state: AdminShopState, { error }: { error: AdminShopError; }): AdminShopState => ({
      ...state,
      saveStatus: RequestStatus.Error,
      error,
    }),
  ),
);
