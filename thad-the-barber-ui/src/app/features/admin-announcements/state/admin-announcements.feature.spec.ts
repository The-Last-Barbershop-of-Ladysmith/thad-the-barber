import { RequestStatus } from '../../../shared/models/request.models';
import { adminAnnouncementsFeature } from './admin-announcements.feature';
import { AdminAnnouncementsState, initialAdminAnnouncementsState } from './admin-announcements.state';

function stateOf(state: AdminAnnouncementsState): Record<string, AdminAnnouncementsState> {
  return { [adminAnnouncementsFeature.name]: state };
}

describe('adminAnnouncementsFeature selectors', (): void => {
  it('is not loading, saving or loaded at first', (): void => {
    const state: Record<string, AdminAnnouncementsState> = stateOf(initialAdminAnnouncementsState);

    expect(adminAnnouncementsFeature.selectIsLoading(state)).toBe(false);
    expect(adminAnnouncementsFeature.selectIsSaving(state)).toBe(false);
    expect(adminAnnouncementsFeature.selectIsLoaded(state)).toBe(false);
  });

  it('follows the load and save status', (): void => {
    const loading: Record<string, AdminAnnouncementsState> = stateOf({
      ...initialAdminAnnouncementsState,
      loadStatus: RequestStatus.Pending,
      saveStatus: RequestStatus.Pending,
    });
    const loaded: Record<string, AdminAnnouncementsState> = stateOf({
      ...initialAdminAnnouncementsState,
      loadStatus: RequestStatus.Success,
    });

    expect(adminAnnouncementsFeature.selectIsLoading(loading)).toBe(true);
    expect(adminAnnouncementsFeature.selectIsSaving(loading)).toBe(true);
    expect(adminAnnouncementsFeature.selectIsLoaded(loaded)).toBe(true);
  });

  it('says when a photo is uploading', (): void => {
    const state: Record<string, AdminAnnouncementsState> = stateOf({
      ...initialAdminAnnouncementsState,
      imageUploadStatus: RequestStatus.Pending,
    });

    expect(adminAnnouncementsFeature.selectIsImageUploading(state)).toBe(true);
    expect(adminAnnouncementsFeature.selectIsImageUploading(stateOf(initialAdminAnnouncementsState))).toBe(false);
  });
});
