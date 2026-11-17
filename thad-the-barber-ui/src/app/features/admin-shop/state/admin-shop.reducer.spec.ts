import { RequestStatus } from '../../../shared/models/request.models';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { AdminShopError } from '../models/admin-shop-error.model';
import * as AdminShopActions from './admin-shop.actions';
import { adminShopReducer } from './admin-shop.reducer';
import { AdminShopState, initialAdminShopState } from './admin-shop.state';

const INFO: AdminShopInfoDto = {
  notice: 'Closed Monday.',
  isNoticeShown: true,
  squareNotice: 'From Square',
};

describe('adminShopReducer', (): void => {
  it('starts empty and idle', (): void => {
    expect(adminShopReducer(undefined, { type: 'unknown' })).toEqual(initialAdminShopState);
  });

  it('tracks a load', (): void => {
    const pending: AdminShopState = adminShopReducer(initialAdminShopState, AdminShopActions.AdminShopRequest());
    const loaded: AdminShopState = adminShopReducer(pending, AdminShopActions.AdminShopRequestSuccess({ info: INFO }));

    expect(pending.loadStatus).toBe(RequestStatus.Pending);
    expect(loaded.loadStatus).toBe(RequestStatus.Success);
    expect(loaded.info).toEqual(INFO);
  });

  it('says why a load failed', (): void => {
    const failed: AdminShopState = adminShopReducer(
      initialAdminShopState,
      AdminShopActions.AdminShopRequestFailure({ error: AdminShopError.Unavailable }),
    );

    expect(failed.loadStatus).toBe(RequestStatus.Error);
    expect(failed.error).toBe(AdminShopError.Unavailable);
  });

  it('tracks a save and keeps what the API answered with', (): void => {
    const pending: AdminShopState = adminShopReducer(
      { ...initialAdminShopState, error: AdminShopError.Failed },
      AdminShopActions.AdminShopSave({ request: { notice: null, isNoticeShown: false } }),
    );
    const saved: AdminShopState = adminShopReducer(
      pending,
      AdminShopActions.AdminShopSaveSuccess({
        info: {
          ...INFO,
          notice: null,
          isNoticeShown: false,
        },
      }),
    );

    expect(pending.saveStatus).toBe(RequestStatus.Pending);
    expect(pending.error).toBeNull();
    expect(saved.saveStatus).toBe(RequestStatus.Success);
    expect(saved.info?.isNoticeShown).toBe(false);
  });

  it('says why a save failed', (): void => {
    const failed: AdminShopState = adminShopReducer(
      initialAdminShopState,
      AdminShopActions.AdminShopSaveFailure({ error: AdminShopError.Invalid }),
    );

    expect(failed.saveStatus).toBe(RequestStatus.Error);
    expect(failed.error).toBe(AdminShopError.Invalid);
  });

  it('starts a fresh load from a clean save status', (): void => {
    const state: AdminShopState = adminShopReducer(
      { ...initialAdminShopState, saveStatus: RequestStatus.Success },
      AdminShopActions.AdminShopRequest(),
    );

    expect(state.saveStatus).toBe(RequestStatus.Idle);
  });
});
