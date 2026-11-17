import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, FunctionalEffect, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { ANNOUNCEMENTS_PATH } from '../config/announcements-paths';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AdminAnnouncementsService } from '../services/admin-announcements.service';
import { toAdminAnnouncementsError } from '../utils/admin-announcements-error.utils';
import * as AdminAnnouncementsActions from './admin-announcements.actions';

export const loadAdminAnnouncements: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminAnnouncementsService = inject(AdminAnnouncementsService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminAnnouncementsActions.AdminAnnouncementsRequest),
      switchMap((): Observable<Action> =>
        service.getAll().pipe(
          map((items: AdminAnnouncementDto[]): Action =>
            AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess({ items })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminAnnouncementsActions.AdminAnnouncementsRequestFailure({
              error: toAdminAnnouncementsError(error),
            }))),
        )),
    ),
  { functional: true },
);

export const saveAdminAnnouncements: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    service: AdminAnnouncementsService = inject(AdminAnnouncementsService),
  ): Observable<Action> =>
    actions$.pipe(
      ofType(AdminAnnouncementsActions.AdminAnnouncementsSave),
      switchMap(({ items }: { items: AnnouncementInputDto[]; }): Observable<Action> =>
        service.save(items).pipe(
          map((saved: AdminAnnouncementDto[]): Action =>
            AdminAnnouncementsActions.AdminAnnouncementsSaveSuccess({ items: saved })),
          catchError((error: unknown): Observable<Action> =>
            of(AdminAnnouncementsActions.AdminAnnouncementsSaveFailure({ error: toAdminAnnouncementsError(error) }))),
        )),
    ),
  { functional: true },
);

/** A saved change (from the form, or End now and Delete on the list) leaves the viewer on the list. */
export const showListAfterSave: FunctionalEffect = createEffect(
  (
    actions$: Actions = inject<Actions>(Actions),
    router: Router = inject(Router),
  ): Observable<unknown> =>
    actions$.pipe(
      ofType(AdminAnnouncementsActions.AdminAnnouncementsSaveSuccess),
      tap((): void => {
        void router.navigateByUrl(ANNOUNCEMENTS_PATH);
      }),
    ),
  { functional: true, dispatch: false },
);
