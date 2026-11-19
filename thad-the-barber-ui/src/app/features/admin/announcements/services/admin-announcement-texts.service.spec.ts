import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ADMIN_ANNOUNCEMENT_TEXTS_URL, AdminAnnouncementTextsService } from './admin-announcement-texts.service';

describe('AdminAnnouncementTextsService', (): void => {
  let service: AdminAnnouncementTextsService;
  let http: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminAnnouncementTextsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    http.verify();
  });

  it('posts the announcement to be worded to the preview address', (): void => {
    service.preview({
      title: 'Open late',
      bodyHtml: '<p>Hi</p>',
      startDate: '2026-11-20',
    }).subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(
      `${ADMIN_ANNOUNCEMENT_TEXTS_URL}/preview`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Open late',
      bodyHtml: '<p>Hi</p>',
      startDate: '2026-11-20',
    });
    request.flush({});
  });

  it('posts the message to send', (): void => {
    service.send({
      title: 'Open late',
      startDate: '2026-11-20',
      message: 'Open late! Reply STOP to opt out.',
    }).subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_ANNOUNCEMENT_TEXTS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Open late',
      startDate: '2026-11-20',
      message: 'Open late! Reply STOP to opt out.',
    });
    request.flush({});
  });
});
