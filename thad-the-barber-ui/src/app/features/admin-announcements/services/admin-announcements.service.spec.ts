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
});
