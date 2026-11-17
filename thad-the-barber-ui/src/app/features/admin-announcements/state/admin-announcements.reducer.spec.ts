import { RequestStatus } from '../../../shared/models/request.models';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AdminAnnouncementStatus } from '../models/admin-announcement-status.model';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';
import * as AdminAnnouncementsActions from './admin-announcements.actions';
import { adminAnnouncementsReducer } from './admin-announcements.reducer';
import { AdminAnnouncementsState, initialAdminAnnouncementsState } from './admin-announcements.state';

const ITEM: AdminAnnouncementDto = {
  title: 'Holiday hours',
  bodyHtml: '<p>Hi</p>',
  startDate: '2026-11-20',
  endDate: '2026-12-26',
  image: null,
  buttons: [],
  status: AdminAnnouncementStatus.Showing,
};

describe('adminAnnouncementsReducer', (): void => {
  it('starts empty and idle', (): void => {
    expect(adminAnnouncementsReducer(undefined, { type: 'unknown' })).toEqual(initialAdminAnnouncementsState);
  });

  it('tracks a load', (): void => {
    const pending: AdminAnnouncementsState = adminAnnouncementsReducer(
      initialAdminAnnouncementsState,
      AdminAnnouncementsActions.AdminAnnouncementsRequest(),
    );
    const loaded: AdminAnnouncementsState = adminAnnouncementsReducer(
      pending,
      AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess({ items: [ITEM] }),
    );

    expect(pending.loadStatus).toBe(RequestStatus.Pending);
    expect(loaded.loadStatus).toBe(RequestStatus.Success);
    expect(loaded.items).toEqual([ITEM]);
  });

  it('keeps the list it has when a later load fails, and says why', (): void => {
    const state: AdminAnnouncementsState = adminAnnouncementsReducer(
      {
        ...initialAdminAnnouncementsState,
        items: [ITEM],
        loadStatus: RequestStatus.Success,
      },
      AdminAnnouncementsActions.AdminAnnouncementsRequestFailure({ error: AdminAnnouncementsError.Unavailable }),
    );

    expect(state.items).toEqual([ITEM]);
    expect(state.loadStatus).toBe(RequestStatus.Error);
    expect(state.error).toBe(AdminAnnouncementsError.Unavailable);
  });

  it('tracks a save, replacing the list with the one saved', (): void => {
    const pending: AdminAnnouncementsState = adminAnnouncementsReducer(
      { ...initialAdminAnnouncementsState, error: AdminAnnouncementsError.Failed },
      AdminAnnouncementsActions.AdminAnnouncementsSave({ items: [] }),
    );
    const saved: AdminAnnouncementsState = adminAnnouncementsReducer(
      pending,
      AdminAnnouncementsActions.AdminAnnouncementsSaveSuccess({ items: [ITEM] }),
    );

    expect(pending.saveStatus).toBe(RequestStatus.Pending);
    expect(pending.error).toBeNull();
    expect(saved.saveStatus).toBe(RequestStatus.Success);
    expect(saved.items).toEqual([ITEM]);
  });

  it('says why a save failed and lets the message be dismissed', (): void => {
    const failed: AdminAnnouncementsState = adminAnnouncementsReducer(
      initialAdminAnnouncementsState,
      AdminAnnouncementsActions.AdminAnnouncementsSaveFailure({ error: AdminAnnouncementsError.Invalid }),
    );
    const dismissed: AdminAnnouncementsState = adminAnnouncementsReducer(
      failed,
      AdminAnnouncementsActions.AdminAnnouncementsErrorDismissed(),
    );

    expect(failed.saveStatus).toBe(RequestStatus.Error);
    expect(failed.error).toBe(AdminAnnouncementsError.Invalid);
    expect(dismissed.error).toBeNull();
  });
});
