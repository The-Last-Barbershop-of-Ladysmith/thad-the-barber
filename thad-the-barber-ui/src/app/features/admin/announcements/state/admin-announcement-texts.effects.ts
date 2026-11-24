import { inject } from '@angular/core';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AnnouncementTextPreviewRequestDto } from '../dtos/announcement-text-preview-request.dto';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextRequestDto } from '../dtos/announcement-text-request.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';
import { AdminAnnouncementTextsService } from '../services/admin-announcement-texts.service';
import { toAnnouncementTextError } from '../utils/announcement-text-error.utils';
import * as AdminAnnouncementTextsActions from './admin-announcement-texts.actions';

export const previewAnnouncementText: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminAnnouncementTextsService = inject(AdminAnnouncementTextsService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest),
      switchMap(({ request }: { request: AnnouncementTextPreviewRequestDto; }): Observable<Action> =>
        service.preview(request).pipe(
          map((preview: AnnouncementTextPreviewDto): Action =>
            AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({ preview })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestFailure({
              error: toAnnouncementTextError(error),
            }))),
        )),
    ),
  { functional: true },
);

export const sendAnnouncementText: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminAnnouncementTextsService = inject(AdminAnnouncementTextsService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminAnnouncementTextsActions.AnnouncementTextSend),
      switchMap(({ request }: { request: AnnouncementTextRequestDto; }): Observable<Action> =>
        service.send(request).pipe(
          map((status: AnnouncementTextStatusDto): Action =>
            AdminAnnouncementTextsActions.AnnouncementTextSendSuccess({ status })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminAnnouncementTextsActions.AnnouncementTextSendFailure({ error: toAnnouncementTextError(error) }))),
        )),
    ),
  { functional: true },
);
