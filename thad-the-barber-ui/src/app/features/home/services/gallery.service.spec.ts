import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { GalleryPhoto } from '../models/home.models';
import { GalleryService } from './gallery.service';

describe(
  'GalleryService',
  (): void => {
    const listingUrl: string = `${environment.mediaBaseUrl}?restype=container&comp=list&prefix=gallery/&delimiter=/`;
    const base: string = `${environment.mediaBaseUrl}/gallery`;

    function blob(name: string, lastModified: string): string {
      return `<Blob><Name>gallery/${name}</Name><Properties><Last-Modified>${lastModified}</Last-Modified></Properties></Blob>`;
    }

    function listing(...blobs: string[]): string {
      return `<?xml version="1.0" encoding="utf-8"?><EnumerationResults ContainerName="${environment.mediaBaseUrl}"><Prefix>gallery/</Prefix><Blobs>${blobs.join('')}<BlobPrefix><Name>gallery/old/</Name></BlobPrefix></Blobs><NextMarker /></EnumerationResults>`;
    }

    function photosFrom(listingXml: string): GalleryPhoto[] | undefined {
      let photos: GalleryPhoto[] | undefined;
      TestBed.inject(GalleryService).getPhotos().subscribe((result: GalleryPhoto[]): void => {
        photos = result;
      });
      TestBed.inject(HttpTestingController).expectOne(listingUrl).flush(listingXml);
      return photos;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'lists the supported images in gallery/, newest upload first',
      (): void => {
        const photos: GalleryPhoto[] | undefined = photosFrom(listing(
          blob('low-taper.jpg', 'Tue, 06 Oct 2026 14:00:00 GMT'),
          blob('UPPER_case.JPG', 'Sat, 10 Oct 2026 09:30:00 GMT'),
          blob('portrait.HEIC', 'Sun, 11 Oct 2026 08:00:00 GMT'),
          blob('notes.txt', 'Sun, 11 Oct 2026 08:00:00 GMT'),
          blob('fade.v2.final.webp', 'Thu, 08 Oct 2026 18:45:00 GMT'),
          blob('multiple--dashes.png', 'Mon, 05 Oct 2026 07:15:00 GMT'),
          blob('beard line up.avif', 'Fri, 09 Oct 2026 12:00:00 GMT'),
          blob('crop.jpeg', 'Wed, 07 Oct 2026 10:00:00 GMT'),
        ));

        expect(photos).toEqual([
          { src: `${base}/UPPER_case.JPG`, alt: 'UPPER case' },
          { src: `${base}/beard%20line%20up.avif`, alt: 'Beard line up' },
          { src: `${base}/fade.v2.final.webp`, alt: 'Fade.v2.final' },
          { src: `${base}/crop.jpeg`, alt: 'Crop' },
          { src: `${base}/low-taper.jpg`, alt: 'Low taper' },
          { src: `${base}/multiple--dashes.png`, alt: 'Multiple dashes' },
        ]);
      },
    );

    it(
      'returns no photos for an empty folder',
      (): void => {
        expect(photosFrom(listing())).toEqual([]);
      },
    );
  },
);
