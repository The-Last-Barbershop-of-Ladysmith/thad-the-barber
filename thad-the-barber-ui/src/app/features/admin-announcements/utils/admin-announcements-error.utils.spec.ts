import { HttpErrorResponse } from '@angular/common/http';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';
import { toAdminAnnouncementsError } from './admin-announcements-error.utils';
import { toAnnouncementsMessage } from './announcements-message.utils';

describe('toAdminAnnouncementsError', (): void => {
  it('reads the API problem code', (): void => {
    expect(toAdminAnnouncementsError(new HttpErrorResponse({ status: 503, error: { code: 'announcements_unavailable' } })))
      .toBe(AdminAnnouncementsError.Unavailable);
    expect(toAdminAnnouncementsError(new HttpErrorResponse({ status: 400, error: { code: 'validation_failed' } })))
      .toBe(AdminAnnouncementsError.Invalid);
    expect(toAdminAnnouncementsError(new HttpErrorResponse({ status: 400, error: { code: 'invalid_image' } })))
      .toBe(AdminAnnouncementsError.InvalidImage);
    expect(toAdminAnnouncementsError(new Error('boom'))).toBe(AdminAnnouncementsError.Failed);
  });
});

describe('toAnnouncementsMessage', (): void => {
  it('says something the owner can act on for every error', (): void => {
    for (const error of Object.values(AdminAnnouncementsError)) {
      expect(toAnnouncementsMessage(error).length).toBeGreaterThan(20);
    }
  });
});
