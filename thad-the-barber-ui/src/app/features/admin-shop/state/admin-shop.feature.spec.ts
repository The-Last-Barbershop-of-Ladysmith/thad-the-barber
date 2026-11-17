import { RequestStatus } from '../../../shared/models/request.models';
import { adminShopFeature } from './admin-shop.feature';
import { AdminShopState, initialAdminShopState } from './admin-shop.state';

function stateOf(state: AdminShopState): Record<string, AdminShopState> {
  return { [adminShopFeature.name]: state };
}

describe('adminShopFeature selectors', (): void => {
  it('is not loading, loaded, saving or saved at first', (): void => {
    const state: Record<string, AdminShopState> = stateOf(initialAdminShopState);

    expect(adminShopFeature.selectIsLoading(state)).toBe(false);
    expect(adminShopFeature.selectIsLoaded(state)).toBe(false);
    expect(adminShopFeature.selectIsSaving(state)).toBe(false);
    expect(adminShopFeature.selectIsSaved(state)).toBe(false);
  });

  it('follows the load and save status', (): void => {
    const pending: Record<string, AdminShopState> = stateOf({
      ...initialAdminShopState,
      loadStatus: RequestStatus.Pending,
      saveStatus: RequestStatus.Pending,
    });
    const done: Record<string, AdminShopState> = stateOf({
      ...initialAdminShopState,
      loadStatus: RequestStatus.Success,
      saveStatus: RequestStatus.Success,
    });

    expect(adminShopFeature.selectIsLoading(pending)).toBe(true);
    expect(adminShopFeature.selectIsSaving(pending)).toBe(true);
    expect(adminShopFeature.selectIsLoaded(done)).toBe(true);
    expect(adminShopFeature.selectIsSaved(done)).toBe(true);
  });
});
