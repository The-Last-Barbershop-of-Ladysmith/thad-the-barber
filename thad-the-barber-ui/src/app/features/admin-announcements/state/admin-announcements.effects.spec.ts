import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AdminAnnouncementStatus } from '../models/admin-announcement-status.model';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';
import { AdminAnnouncementsService } from '../services/admin-announcements.service';
import * as AdminAnnouncementsActions from './admin-announcements.actions';
import { loadAdminAnnouncements, saveAdminAnnouncements, showListAfterSave } from './admin-announcements.effects';

const ITEM: AdminAnnouncementDto = {
  title: 'Holiday hours',
  bodyHtml: '<p>Hi</p>',
  startDate: '2026-11-20',
  endDate: '2026-12-26',
  image: null,
  buttons: [],
  status: AdminAnnouncementStatus.Showing,
};

const REQUEST: Action = AdminAnnouncementsActions.AdminAnnouncementsRequest();
const SAVE: Action = AdminAnnouncementsActions.AdminAnnouncementsSave({ items: [] });

describe('admin announcements effects', (): void => {
  let actions: Subject<Action>;
  let service: {
    getAll: () => Observable<AdminAnnouncementDto[]>;
    save: (items: AnnouncementInputDto[]) => Observable<AdminAnnouncementDto[]>;
  };
  let navigations: string[];

  beforeEach((): void => {
    actions = new Subject<Action>();
    navigations = [];
    service = {
      getAll: (): Observable<AdminAnnouncementDto[]> => of([ITEM]),
      save: (): Observable<AdminAnnouncementDto[]> => of([ITEM]),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: actions },
        { provide: AdminAnnouncementsService, useFactory: (): unknown => service },
        {
          provide: Router,
          useValue: {
            navigateByUrl: (url: string): Promise<boolean> => {
              navigations.push(url);
              return Promise.resolve(true);
            },
          },
        },
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

  function problem(code: string, status: number): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: { code } });
  }

  it('loads the list', (): void => {
    const results: Action[] = emitted(loadAdminAnnouncements, REQUEST);

    expect(results).toEqual([AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess({ items: [ITEM] })]);
  });

  it('says the file is unavailable when the API says so, and failed for anything else', (): void => {
    service.getAll = (): Observable<AdminAnnouncementDto[]> =>
      throwError((): HttpErrorResponse => problem('announcements_unavailable', 503));
    const results: Action[] = emitted(loadAdminAnnouncements, REQUEST);
    const failure: Action = AdminAnnouncementsActions.AdminAnnouncementsRequestFailure({
      error: AdminAnnouncementsError.Unavailable,
    });

    expect(results).toEqual([failure]);
  });

  it('saves the list it is given and answers with the list as saved', (): void => {
    const sent: AnnouncementInputDto[][] = [];
    service.save = (items: AnnouncementInputDto[]): Observable<AdminAnnouncementDto[]> => {
      sent.push(items);
      return of([ITEM]);
    };

    const results: Action[] = emitted(saveAdminAnnouncements, SAVE);

    expect(sent).toEqual([[]]);
    expect(results).toEqual([AdminAnnouncementsActions.AdminAnnouncementsSaveSuccess({ items: [ITEM] })]);
  });

  it('says a refused save was invalid', (): void => {
    service.save = (): Observable<AdminAnnouncementDto[]> =>
      throwError((): HttpErrorResponse => problem('validation_failed', 400));

    const results: Action[] = emitted(saveAdminAnnouncements, SAVE);
    const failure: Action = AdminAnnouncementsActions.AdminAnnouncementsSaveFailure({
      error: AdminAnnouncementsError.Invalid,
    });

    expect(results).toEqual([failure]);
  });

  it('says a save that could not be told apart failed', (): void => {
    service.save = (): Observable<AdminAnnouncementDto[]> =>
      throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 500 }));

    const results: Action[] = emitted(saveAdminAnnouncements, SAVE);
    const failure: Action = AdminAnnouncementsActions.AdminAnnouncementsSaveFailure({
      error: AdminAnnouncementsError.Failed,
    });

    expect(results).toEqual([failure]);
  });

  it('goes to the list after a save', (): void => {
    emitted(showListAfterSave, AdminAnnouncementsActions.AdminAnnouncementsSaveSuccess({ items: [] }));

    expect(navigations).toEqual(['/admin/announcements']);
  });
});
