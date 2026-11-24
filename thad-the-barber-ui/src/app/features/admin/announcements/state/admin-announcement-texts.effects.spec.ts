import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AnnouncementTextPreviewRequestDto } from '../dtos/announcement-text-preview-request.dto';
import { AnnouncementTextPreviewDto } from '../dtos/announcement-text-preview.dto';
import { AnnouncementTextRequestDto } from '../dtos/announcement-text-request.dto';
import { AnnouncementTextStatusDto } from '../dtos/announcement-text-status.dto';
import { AnnouncementSendState } from '../models/announcement-send-state.model';
import { AnnouncementTextError } from '../models/announcement-text-error.model';
import { AdminAnnouncementTextsService } from '../services/admin-announcement-texts.service';
import * as AdminAnnouncementTextsActions from './admin-announcement-texts.actions';
import { previewAnnouncementText, sendAnnouncementText } from './admin-announcement-texts.effects';

const PREVIEW_REQUEST: AnnouncementTextPreviewRequestDto = {
  title: 'Open late',
  bodyHtml: null,
  startDate: '2026-11-20',
};

const SEND_REQUEST: AnnouncementTextRequestDto = {
  title: 'Open late',
  startDate: '2026-11-20',
  message: 'Open late! Reply STOP to opt out.',
};

const PREVIEW: AnnouncementTextPreviewDto = {
  message: 'Shop: Open late. Reply STOP to opt out.',
  subscriberCount: 3,
  isEnabled: true,
  isScheduled: false,
  alreadyTexted: null,
};

const STATUS: AnnouncementTextStatusDto = {
  id: '20261120-abc',
  state: AnnouncementSendState.Queued,
  sendOn: '2026-11-20',
  total: 3,
  sentCount: 0,
  failedCount: 0,
};

describe('admin announcement texts effects', (): void => {
  let actions: Subject<Action>;
  let service: {
    preview: (request: AnnouncementTextPreviewRequestDto) => Observable<AnnouncementTextPreviewDto>;
    send: (request: AnnouncementTextRequestDto) => Observable<AnnouncementTextStatusDto>;
  };

  beforeEach((): void => {
    actions = new Subject<Action>();
    service = {
      preview: (): Observable<AnnouncementTextPreviewDto> => of(PREVIEW),
      send: (): Observable<AnnouncementTextStatusDto> => of(STATUS),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: actions },
        { provide: AdminAnnouncementTextsService, useFactory: (): unknown => service },
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

  it('asks for the preview of the announcement it is given', (): void => {
    const asked: AnnouncementTextPreviewRequestDto[] = [];
    service.preview = (request: AnnouncementTextPreviewRequestDto): Observable<AnnouncementTextPreviewDto> => {
      asked.push(request);
      return of(PREVIEW);
    };

    const results: Action[] = emitted(
      previewAnnouncementText,
      AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest({ request: PREVIEW_REQUEST }),
    );

    expect(asked).toEqual([PREVIEW_REQUEST]);
    const success: Action = AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({ preview: PREVIEW });
    expect(results).toEqual([success]);
  });

  it('says a preview that failed failed', (): void => {
    service.preview = (): Observable<AnnouncementTextPreviewDto> =>
      throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 500 }));

    const results: Action[] = emitted(
      previewAnnouncementText,
      AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest({ request: PREVIEW_REQUEST }),
    );

    const error: AnnouncementTextError = AnnouncementTextError.Failed;
    const failure: Action = AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestFailure({ error });
    expect(results).toEqual([failure]);
  });

  it('sends exactly the message it is given and answers with where the text stands', (): void => {
    const sent: AnnouncementTextRequestDto[] = [];
    service.send = (request: AnnouncementTextRequestDto): Observable<AnnouncementTextStatusDto> => {
      sent.push(request);
      return of(STATUS);
    };

    const results: Action[] = emitted(
      sendAnnouncementText,
      AdminAnnouncementTextsActions.AnnouncementTextSend({ request: SEND_REQUEST }),
    );

    expect(sent).toEqual([SEND_REQUEST]);
    expect(results).toEqual([AdminAnnouncementTextsActions.AnnouncementTextSendSuccess({ status: STATUS })]);
  });

  it('says an announcement that was already texted was', (): void => {
    service.send = (): Observable<AnnouncementTextStatusDto> =>
      throwError((): HttpErrorResponse => problem('already_texted', 409));

    const results: Action[] = emitted(
      sendAnnouncementText,
      AdminAnnouncementTextsActions.AnnouncementTextSend({ request: SEND_REQUEST }),
    );

    const error: AnnouncementTextError = AnnouncementTextError.AlreadyTexted;
    const failure: Action = AdminAnnouncementTextsActions.AnnouncementTextSendFailure({ error });
    expect(results).toEqual([failure]);
  });

  it('says texts are unavailable while they are switched off', (): void => {
    service.send = (): Observable<AnnouncementTextStatusDto> =>
      throwError((): HttpErrorResponse => problem('texts_unavailable', 503));

    const results: Action[] = emitted(
      sendAnnouncementText,
      AdminAnnouncementTextsActions.AnnouncementTextSend({ request: SEND_REQUEST }),
    );

    const error: AnnouncementTextError = AnnouncementTextError.Unavailable;
    const failure: Action = AdminAnnouncementTextsActions.AnnouncementTextSendFailure({ error });
    expect(results).toEqual([failure]);
  });
});
