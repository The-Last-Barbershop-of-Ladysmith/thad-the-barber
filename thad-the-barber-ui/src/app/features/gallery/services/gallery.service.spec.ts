import { HttpContext, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ANONYMOUS_REQUEST } from '../../../core/interceptors/anonymous-request.token';
import { GalleryPhoto } from '../models/gallery-photo.model';
import { GALLERY_URL, GalleryService } from './gallery.service';

describe(
  'GalleryService',
  (): void => {
    function request(): {
      result: () => GalleryPhoto[] | undefined; failed: () => boolean; http: TestRequest;
    } {
      let photos: GalleryPhoto[] | undefined;
      let hasFailed: boolean = false;
      TestBed.inject(GalleryService).getPhotos().subscribe({
        next: (result: GalleryPhoto[]): void => {
          photos = result;
        },
        error: (): void => {
          hasFailed = true;
        },
      });
      return {
        result: (): GalleryPhoto[] | undefined => photos,
        failed: (): boolean => hasFailed,
        http: TestBed.inject(HttpTestingController).expectOne(GALLERY_URL),
      };
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'keeps the API order and the source and alt text of each photo',
      (): void => {
        const photosFromApi: GalleryPhoto[] = [
          {
            src: 'https://media.example.test/gallery/UPPER_case.JPG',
            alt: 'UPPER case',
          },
          {
            src: 'https://media.example.test/gallery/beard%20line%20up.avif',
            alt: 'Beard line up',
          },
        ];
        const pending: ReturnType<typeof request> = request();

        pending.http.flush(photosFromApi);

        expect(pending.result()).toEqual(photosFromApi);
      },
    );

    it(
      'returns no photos for an empty list',
      (): void => {
        const pending: ReturnType<typeof request> = request();

        pending.http.flush([]);

        expect(pending.result()).toEqual([]);
      },
    );

    it(
      'asks anonymously, so no session token is requested',
      (): void => {
        const pending: ReturnType<typeof request> = request();
        const context: HttpContext = pending.http.request.context;

        pending.http.flush([]);

        expect(context.get(ANONYMOUS_REQUEST)).toBe(true);
      },
    );

    it(
      'fails when the API does, so the section hides',
      (): void => {
        const pending: ReturnType<typeof request> = request();

        pending.http.flush('down', { status: 503, statusText: 'Service Unavailable' });

        expect(pending.failed()).toBe(true);
      },
    );
  },
);
