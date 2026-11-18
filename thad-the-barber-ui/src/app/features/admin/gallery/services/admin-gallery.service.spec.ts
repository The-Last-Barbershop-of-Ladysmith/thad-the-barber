import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ADMIN_GALLERY_URL, AdminGalleryService } from './admin-gallery.service';

describe('AdminGalleryService', (): void => {
  let service: AdminGalleryService;
  let http: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminGalleryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    http.verify();
  });

  it('gets every photo', (): void => {
    service.getAll().subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_GALLERY_URL);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('posts the file and its description as a form', (): void => {
    const file: File = new File(
      ['x'],
      'fade.jpg',
      { type: 'image/jpeg' },
    );
    service.upload(file, 'Skin fade').subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(ADMIN_GALLERY_URL);
    const form: FormData = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(form.get('altText')).toBe('Skin fade');
    expect((form.get('file') as File).name).toBe('fade.jpg');
    request.flush({});
  });

  it('deletes a photo by its encoded file name', (): void => {
    service.delete('skin fade_beard.jpg').subscribe();

    const request: ReturnType<HttpTestingController['expectOne']> = http.expectOne(
      `${ADMIN_GALLERY_URL}/skin%20fade_beard.jpg`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
