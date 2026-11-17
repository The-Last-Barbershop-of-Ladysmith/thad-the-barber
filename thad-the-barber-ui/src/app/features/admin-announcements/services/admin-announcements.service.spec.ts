import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { ADMIN_ANNOUNCEMENTS_URL, AdminAnnouncementsService } from './admin-announcements.service';

describe('AdminAnnouncementsService', (): void => {
  let service: AdminAnnouncementsService;
  let http: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminAnnouncementsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    http.verify();
  });

  it('gets every announcement', (): void => {
    service.getAll().subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_ANNOUNCEMENTS_URL);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('puts the whole list as { items }', (): void => {
    const items: AnnouncementInputDto[] = [];
    service.save(items).subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_ANNOUNCEMENTS_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ items });
    request.flush([]);
  });

  it('posts a photo for an announcement as a form', (): void => {
    const file: File = new File(
      ['x'],
      'sign.webp',
      { type: 'image/webp' },
    );
    service.uploadImage(file).subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(`${ADMIN_ANNOUNCEMENTS_URL}/images`);
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('file')).toBeInstanceOf(File);
    request.flush({ fileName: 'a.webp', src: 'https://example.test/a.webp' });
  });
});
