import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { GalleryPhoto } from '../models/home.models';
import { GalleryService } from './gallery.service';

describe(
  'GalleryService',
  (): void => {
    const photo: GalleryPhoto = {
      id: 'skin-fade',
      image: 'skin-fade-03',
      alt: 'Skin fade, side view',
      width: 1200,
      height: 1600,
    };

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'reads the photos from content/gallery.json under mediaBaseUrl',
      (): void => {
        let photos: GalleryPhoto[] | undefined;

        TestBed.inject(GalleryService).getPhotos().subscribe((result: GalleryPhoto[]): void => {
          photos = result;
        });
        TestBed.inject(HttpTestingController)
          .expectOne(`${environment.mediaBaseUrl}/content/gallery.json`)
          .flush({ photos: [photo] });

        expect(photos).toEqual([photo]);
      },
    );
  },
);
