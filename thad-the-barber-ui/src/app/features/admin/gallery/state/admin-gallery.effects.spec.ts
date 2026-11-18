import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../models/admin-gallery-error.model';
import { AdminGalleryService } from '../services/admin-gallery.service';
import * as AdminGalleryActions from './admin-gallery.actions';
import { deleteAdminGalleryPhoto, loadAdminGallery, uploadAdminGalleryPhoto } from './admin-gallery.effects';

const PHOTO: AdminGalleryPhotoDto = {
  fileName: 'fade.jpg',
  src: 'https://example.test/gallery/fade.jpg',
  altText: 'Fade',
  uploadedAt: '2026-10-05T10:00:00Z',
};
const FILE: File = new File(
  ['x'],
  'fade.jpg',
  { type: 'image/jpeg' },
);

function problem(code: string, status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { code } });
}

describe('admin gallery effects', (): void => {
  let actions: Subject<Action>;
  let service: {
    getAll: () => Observable<AdminGalleryPhotoDto[]>;
    upload: (file: File, altText: string) => Observable<AdminGalleryPhotoDto>;
    delete: (fileName: string) => Observable<null>;
  };

  beforeEach((): void => {
    actions = new Subject<Action>();
    service = {
      getAll: (): Observable<AdminGalleryPhotoDto[]> => of([PHOTO]),
      upload: (): Observable<AdminGalleryPhotoDto> => of(PHOTO),
      delete: (): Observable<null> => of(null),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: actions },
        { provide: AdminGalleryService, useFactory: (): unknown => service },
      ],
    });
  });

  function emitted(effect: unknown, action: Action): Action[] {
    const results: Action[] = [];
    TestBed.runInInjectionContext((): Observable<Action> => (effect as () => Observable<Action>)())
      .subscribe((result: Action): void => {
        results.push(result);
      });
    actions.next(action);
    return results;
  }

  it('loads the photos', (): void => {
    const results: Action[] = emitted(loadAdminGallery, AdminGalleryActions.AdminGalleryRequest());

    expect(results).toEqual([AdminGalleryActions.AdminGalleryRequestSuccess({ photos: [PHOTO] })]);
  });

  it('says the gallery is unavailable when the API says so', (): void => {
    service.getAll = (): Observable<AdminGalleryPhotoDto[]> =>
      throwError((): HttpErrorResponse => problem('gallery_unavailable', 503));
    const failure: Action = AdminGalleryActions.AdminGalleryRequestFailure({ error: AdminGalleryError.Unavailable });

    expect(emitted(loadAdminGallery, AdminGalleryActions.AdminGalleryRequest())).toEqual([failure]);
  });

  it('sends the file with its description and answers with the stored photo', (): void => {
    const sent: { file: File; altText: string; }[] = [];
    service.upload = (file: File, altText: string): Observable<AdminGalleryPhotoDto> => {
      sent.push({ file, altText });
      return of(PHOTO);
    };

    const results: Action[] = emitted(
      uploadAdminGalleryPhoto,
      AdminGalleryActions.AdminGalleryUpload({ file: FILE, altText: 'Fade' }),
    );

    expect(sent).toEqual([{ file: FILE, altText: 'Fade' }]);
    expect(results).toEqual([AdminGalleryActions.AdminGalleryUploadSuccess({ photo: PHOTO })]);
  });

  it('says a refused file could not be used', (): void => {
    service.upload = (): Observable<AdminGalleryPhotoDto> =>
      throwError((): HttpErrorResponse => problem('invalid_image', 400));
    const failure: Action = AdminGalleryActions.AdminGalleryUploadFailure({ error: AdminGalleryError.InvalidImage });

    const results: Action[] = emitted(
      uploadAdminGalleryPhoto,
      AdminGalleryActions.AdminGalleryUpload({ file: FILE, altText: 'Fade' }),
    );

    expect(results).toEqual([failure]);
  });

  it('deletes a photo by its file name', (): void => {
    const results: Action[] = emitted(
      deleteAdminGalleryPhoto,
      AdminGalleryActions.AdminGalleryDelete({ fileName: 'fade.jpg' }),
    );

    expect(results).toEqual([AdminGalleryActions.AdminGalleryDeleteSuccess({ fileName: 'fade.jpg' })]);
  });

  it('says a photo that was already gone is not found, and any other failure failed', (): void => {
    service.delete = (): Observable<null> => throwError((): HttpErrorResponse => problem('photo_not_found', 404));
    const failure: Action = AdminGalleryActions.AdminGalleryDeleteFailure({
      fileName: 'fade.jpg',
      error: AdminGalleryError.NotFound,
    });

    const results: Action[] = emitted(
      deleteAdminGalleryPhoto,
      AdminGalleryActions.AdminGalleryDelete({ fileName: 'fade.jpg' }),
    );

    expect(results).toEqual([failure]);
  });
});
