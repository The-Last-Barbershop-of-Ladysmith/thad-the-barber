import { RequestStatus } from '../../../../shared/models/request.models';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';
import { AnnouncementSendState } from '../models/announcement-send-state.model';
import { AnnouncementTextError } from '../models/announcement-text-error.model';
import * as AdminAnnouncementTextsActions from './admin-announcement-texts.actions';
import { adminAnnouncementTextsReducer } from './admin-announcement-texts.reducer';
import { AdminAnnouncementTextsState, initialAdminAnnouncementTextsState } from './admin-announcement-texts.state';

const PREVIEW: AnnouncementTextPreviewDto = {
  message: 'Shop: Open late. Reply STOP to opt out.',
  subscriberCount: 12,
  isEnabled: true,
  isScheduled: false,
  alreadyTexted: null,
};

const STATUS: AnnouncementTextStatusDto = {
  id: '20261120-abc',
  state: AnnouncementSendState.Queued,
  sendOn: '2026-11-20',
  total: 12,
  sentCount: 0,
  failedCount: 0,
};

describe('adminAnnouncementTextsReducer', (): void => {
  it('starts empty and idle', (): void => {
    expect(adminAnnouncementTextsReducer(undefined, { type: 'unknown' })).toEqual(initialAdminAnnouncementTextsState);
  });

  it('tracks a preview', (): void => {
    const pending: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      initialAdminAnnouncementTextsState,
      AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest({
        request: {
          title: 'Open late',
          bodyHtml: null,
          startDate: '2026-11-20',
        },
      }),
    );
    const shown: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      pending,
      AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({ preview: PREVIEW }),
    );

    expect(pending.previewStatus).toBe(RequestStatus.Pending);
    expect(shown.previewStatus).toBe(RequestStatus.Success);
    expect(shown.preview).toEqual(PREVIEW);
  });

  it('keeps the error of a failed preview', (): void => {
    const failed: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      initialAdminAnnouncementTextsState,
      AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestFailure({ error: AnnouncementTextError.Failed }),
    );

    expect(failed.previewStatus).toBe(RequestStatus.Error);
    expect(failed.error).toBe(AnnouncementTextError.Failed);
  });

  it('tracks a send and keeps where the text stands', (): void => {
    const pending: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      initialAdminAnnouncementTextsState,
      AdminAnnouncementTextsActions.AnnouncementTextSend({
        request: {
          title: 'Open late',
          startDate: '2026-11-20',
          message: 'Hi',
        },
      }),
    );
    const sent: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      pending,
      AdminAnnouncementTextsActions.AnnouncementTextSendSuccess({ status: STATUS }),
    );

    expect(pending.sendStatus).toBe(RequestStatus.Pending);
    expect(sent.sendStatus).toBe(RequestStatus.Success);
    expect(sent.sent).toEqual(STATUS);
  });

  it('keeps the error of a failed send, and clears it on the next try', (): void => {
    const failed: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      initialAdminAnnouncementTextsState,
      AdminAnnouncementTextsActions.AnnouncementTextSendFailure({ error: AnnouncementTextError.AlreadyTexted }),
    );
    const retrying: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      failed,
      AdminAnnouncementTextsActions.AnnouncementTextSend({
        request: {
          title: 'Open late',
          startDate: '2026-11-20',
          message: 'Hi',
        },
      }),
    );

    expect(failed.error).toBe(AnnouncementTextError.AlreadyTexted);
    expect(retrying.error).toBeNull();
  });

  it('starts over when the page is left', (): void => {
    const shown: AdminAnnouncementTextsState = adminAnnouncementTextsReducer(
      initialAdminAnnouncementTextsState,
      AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({ preview: PREVIEW }),
    );

    expect(adminAnnouncementTextsReducer(shown, AdminAnnouncementTextsActions.AnnouncementTextReset()))
      .toEqual(initialAdminAnnouncementTextsState);
  });
});
