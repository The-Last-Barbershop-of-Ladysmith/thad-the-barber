import { RequestStatus } from '../../../shared/models/request.models';
import { adminGalleryFeature } from './admin-gallery.feature';
import { AdminGalleryState, initialAdminGalleryState } from './admin-gallery.state';

function stateOf(state: AdminGalleryState): Record<string, AdminGalleryState> {
  return { [adminGalleryFeature.name]: state };
}

describe('adminGalleryFeature selectors', (): void => {
  it('is idle at first', (): void => {
    const state: Record<string, AdminGalleryState> = stateOf(initialAdminGalleryState);

    expect(adminGalleryFeature.selectIsLoading(state)).toBe(false);
    expect(adminGalleryFeature.selectIsLoaded(state)).toBe(false);
    expect(adminGalleryFeature.selectIsUploading(state)).toBe(false);
    expect(adminGalleryFeature.selectIsUploaded(state)).toBe(false);
    expect(adminGalleryFeature.selectIsDeleting(state)).toBe(false);
  });

  it('follows each status', (): void => {
    const pending: Record<string, AdminGalleryState> = stateOf({
      ...initialAdminGalleryState,
      loadStatus: RequestStatus.Pending,
      uploadStatus: RequestStatus.Pending,
      deleteStatus: RequestStatus.Pending,
    });
    const done: Record<string, AdminGalleryState> = stateOf({
      ...initialAdminGalleryState,
      loadStatus: RequestStatus.Success,
      uploadStatus: RequestStatus.Success,
    });

    expect(adminGalleryFeature.selectIsLoading(pending)).toBe(true);
    expect(adminGalleryFeature.selectIsUploading(pending)).toBe(true);
    expect(adminGalleryFeature.selectIsDeleting(pending)).toBe(true);
    expect(adminGalleryFeature.selectIsLoaded(done)).toBe(true);
    expect(adminGalleryFeature.selectIsUploaded(done)).toBe(true);
  });
});
