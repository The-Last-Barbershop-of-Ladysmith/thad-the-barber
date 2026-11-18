import { inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AdminGalleryPhotoDto } from '../dtos/admin-gallery-photo.dto';
import { AdminGalleryService } from '../services/admin-gallery.service';
import { toAdminGalleryError } from '../utils/admin-gallery-error.utils';
import * as AdminGalleryActions from './admin-gallery.actions';

export const loadAdminGallery: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminGalleryService = inject(AdminGalleryService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminGalleryActions.AdminGalleryRequest),
      switchMap((): Observable<Action> =>
        service.getAll().pipe(
          map((photos: AdminGalleryPhotoDto[]): Action => AdminGalleryActions.AdminGalleryRequestSuccess({ photos })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminGalleryActions.AdminGalleryRequestFailure({ error: toAdminGalleryError(error) }))),
        )),
    ),
  { functional: true },
);

export const uploadAdminGalleryPhoto: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminGalleryService = inject(AdminGalleryService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminGalleryActions.AdminGalleryUpload),
      switchMap(({ file, altText }: { file: File; altText: string; }): Observable<Action> =>
        service.upload(file, altText).pipe(
          map((photo: AdminGalleryPhotoDto): Action => AdminGalleryActions.AdminGalleryUploadSuccess({ photo })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminGalleryActions.AdminGalleryUploadFailure({ error: toAdminGalleryError(error) }))),
        )),
    ),
  { functional: true },
);

export const deleteAdminGalleryPhoto: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminGalleryService = inject(AdminGalleryService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminGalleryActions.AdminGalleryDelete),
      switchMap(({ fileName }: { fileName: string; }): Observable<Action> =>
        service.delete(fileName).pipe(
          map((): Action => AdminGalleryActions.AdminGalleryDeleteSuccess({ fileName })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminGalleryActions.AdminGalleryDeleteFailure({ fileName, error: toAdminGalleryError(error) }))),
        )),
    ),
  { functional: true },
);
