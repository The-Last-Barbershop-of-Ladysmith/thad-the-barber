import { RequestStatus } from '../../../shared/models/request.models';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../models/admin-gallery-error.model';
import * as AdminGalleryActions from './admin-gallery.actions';
import { adminGalleryReducer } from './admin-gallery.reducer';
import { AdminGalleryState, initialAdminGalleryState } from './admin-gallery.state';

const OLD: AdminGalleryPhotoDto = {
  fileName: 'old.jpg',
  src: 'https://example.test/gallery/old.jpg',
  altText: 'Old',
  uploadedAt: '2026-10-01T10:00:00Z',
};
const NEW: AdminGalleryPhotoDto = {
  fileName: 'new.jpg',
  src: 'https://example.test/gallery/new.jpg',
  altText: 'New',
  uploadedAt: '2026-10-05T10:00:00Z',
};
const LOADED: AdminGalleryState = {
  ...initialAdminGalleryState,
  photos: [OLD],
  loadStatus: RequestStatus.Success,
};

describe('adminGalleryReducer', (): void => {
  it('starts empty and idle', (): void => {
    expect(adminGalleryReducer(undefined, { type: 'unknown' })).toEqual(initialAdminGalleryState);
  });

  it('tracks a load', (): void => {
    const pending: AdminGalleryState = adminGalleryReducer(
      initialAdminGalleryState,
      AdminGalleryActions.AdminGalleryRequest(),
    );
    const loaded: AdminGalleryState = adminGalleryReducer(
      pending,
      AdminGalleryActions.AdminGalleryRequestSuccess({ photos: [OLD] }),
    );

    expect(pending.loadStatus).toBe(RequestStatus.Pending);
    expect(loaded.photos).toEqual([OLD]);
    expect(loaded.loadStatus).toBe(RequestStatus.Success);
  });

  it('says why a load failed', (): void => {
    const failed: AdminGalleryState = adminGalleryReducer(
      initialAdminGalleryState,
      AdminGalleryActions.AdminGalleryRequestFailure({ error: AdminGalleryError.Unavailable }),
    );

    expect(failed.loadStatus).toBe(RequestStatus.Error);
    expect(failed.error).toBe(AdminGalleryError.Unavailable);
  });

  it('puts an uploaded photo first', (): void => {
    const uploading: AdminGalleryState = adminGalleryReducer(
      LOADED,
      AdminGalleryActions.AdminGalleryUpload({ file: new File([], 'a.jpg'), altText: 'New' }),
    );
    const uploaded: AdminGalleryState = adminGalleryReducer(
      uploading,
      AdminGalleryActions.AdminGalleryUploadSuccess({ photo: NEW }),
    );

    expect(uploading.uploadStatus).toBe(RequestStatus.Pending);
    expect(uploaded.photos).toEqual([NEW, OLD]);
    expect(uploaded.uploadStatus).toBe(RequestStatus.Success);
  });

  it('keeps the photos when an upload fails, and says why', (): void => {
    const failed: AdminGalleryState = adminGalleryReducer(
      LOADED,
      AdminGalleryActions.AdminGalleryUploadFailure({ error: AdminGalleryError.InvalidImage }),
    );

    expect(failed.photos).toEqual([OLD]);
    expect(failed.uploadStatus).toBe(RequestStatus.Error);
    expect(failed.error).toBe(AdminGalleryError.InvalidImage);
  });

  it('takes a deleted photo off the list', (): void => {
    const deleted: AdminGalleryState = adminGalleryReducer(
      { ...LOADED, photos: [NEW, OLD] },
      AdminGalleryActions.AdminGalleryDeleteSuccess({ fileName: 'old.jpg' }),
    );

    expect(deleted.photos).toEqual([NEW]);
    expect(deleted.deleteStatus).toBe(RequestStatus.Success);
  });

  it('keeps a photo whose delete failed, except one that was already gone', (): void => {
    const failed: AdminGalleryState = adminGalleryReducer(
      LOADED,
      AdminGalleryActions.AdminGalleryDeleteFailure({ fileName: 'old.jpg', error: AdminGalleryError.Unavailable }),
    );
    const gone: AdminGalleryState = adminGalleryReducer(
      LOADED,
      AdminGalleryActions.AdminGalleryDeleteFailure({ fileName: 'old.jpg', error: AdminGalleryError.NotFound }),
    );

    expect(failed.photos).toEqual([OLD]);
    expect(gone.photos).toEqual([]);
    expect(gone.error).toBe(AdminGalleryError.NotFound);
  });

  it('starts a fresh load from clean statuses', (): void => {
    const state: AdminGalleryState = adminGalleryReducer(
      {
        ...LOADED,
        uploadStatus: RequestStatus.Success,
        deleteStatus: RequestStatus.Error,
      },
      AdminGalleryActions.AdminGalleryRequest(),
    );

    expect(state.uploadStatus).toBe(RequestStatus.Idle);
    expect(state.deleteStatus).toBe(RequestStatus.Idle);
  });
});
