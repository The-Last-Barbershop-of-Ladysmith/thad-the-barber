import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { GalleryPhoto } from '../../models/home.models';
import { Gallery } from './gallery';

describe(
  'Gallery',
  (): void => {
    const base: string = `${environment.mediaBaseUrl}/gallery`;
    const photos: GalleryPhoto[] = [
      {
        id: 'flat-top',
        image: 'flat-top-11',
        alt: 'Flat top, side view',
        width: 720,
        height: 960,
      },
      {
        id: 'mohawk',
        image: 'mohawk-12',
        alt: 'Burst fade mohawk',
        width: 3000,
        height: 2000,
      },
    ];

    function render(input: GalleryPhoto[]): HTMLElement {
      const fixture: ComponentFixture<Gallery> = TestBed.createComponent(Gallery);
      fixture.componentRef.setInput('photos', input);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it(
      'renders a print per photo with its variants and size from the media container',
      (): void => {
        const images: HTMLImageElement[] = Array.from(render(photos).querySelectorAll<HTMLImageElement>('img'));

        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('src'))).toEqual([`${base}/flat-top-11-md.webp`, `${base}/mohawk-12-md.webp`]);
        expect(images[0]?.getAttribute('srcset')).toBe(`${base}/flat-top-11-sm.webp 480w, ${base}/flat-top-11-md.webp 720w`);
        expect(images[1]?.getAttribute('srcset')).toContain(`${base}/mohawk-12-lg.webp 1600w`);
        expect([images[0]?.getAttribute('width'), images[0]?.getAttribute('height')]).toEqual(['720', '960']);
        expect(images[1]?.getAttribute('alt')).toBe(photos[1]?.alt);
      },
    );

    it(
      'hides the section when there are no photos',
      (): void => {
        expect(render([]).querySelector('[data-testid="gallery"]')).toBeNull();
      },
    );
  },
);
