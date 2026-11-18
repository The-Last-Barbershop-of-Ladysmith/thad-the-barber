import { HttpErrorResponse } from '@angular/common/http';
import { AdminGalleryError } from '../models/admin-gallery-error.model';
import { GalleryUploadProblem } from '../models/gallery-upload-problem.model';
import { toAdminGalleryError, toGalleryMessage, toUploadProblemMessage } from './admin-gallery-error.utils';

function problem(code: string, status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { code } });
}

describe('toAdminGalleryError', (): void => {
  it('reads the API problem code', (): void => {
    expect(toAdminGalleryError(problem('gallery_unavailable', 503))).toBe(AdminGalleryError.Unavailable);
    expect(toAdminGalleryError(problem('invalid_image', 400))).toBe(AdminGalleryError.InvalidImage);
    expect(toAdminGalleryError(problem('photo_not_found', 404))).toBe(AdminGalleryError.NotFound);
    expect(toAdminGalleryError(new Error('boom'))).toBe(AdminGalleryError.Failed);
  });
});

describe('gallery messages', (): void => {
  it('say something the owner can act on for every error and upload problem', (): void => {
    for (const error of Object.values(AdminGalleryError)) {
      expect(toGalleryMessage(error).length).toBeGreaterThan(20);
    }
    for (const found of Object.values(GalleryUploadProblem)) {
      expect(toUploadProblemMessage(found).length).toBeGreaterThan(15);
    }
  });
});
