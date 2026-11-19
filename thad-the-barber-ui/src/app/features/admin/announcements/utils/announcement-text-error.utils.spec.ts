import { HttpErrorResponse } from '@angular/common/http';
import { AnnouncementTextError } from '../models/announcement-text-error.model';
import { toAnnouncementTextError, toAnnouncementTextMessage } from './announcement-text-error.utils';

describe('toAnnouncementTextError', (): void => {
  it('reads the API problem code', (): void => {
    expect(toAnnouncementTextError(new HttpErrorResponse({ status: 503, error: { code: 'texts_unavailable' } })))
      .toBe(AnnouncementTextError.Unavailable);
    expect(toAnnouncementTextError(new HttpErrorResponse({ status: 409, error: { code: 'already_texted' } })))
      .toBe(AnnouncementTextError.AlreadyTexted);
    expect(toAnnouncementTextError(new HttpErrorResponse({ status: 400, error: { code: 'validation_failed' } })))
      .toBe(AnnouncementTextError.Invalid);
    expect(toAnnouncementTextError(new Error('boom'))).toBe(AnnouncementTextError.Failed);
  });
});

describe('toAnnouncementTextMessage', (): void => {
  it('says something the owner can act on for every error', (): void => {
    for (const error of Object.values(AnnouncementTextError)) {
      expect(toAnnouncementTextMessage(error).length).toBeGreaterThan(20);
    }
  });
});
