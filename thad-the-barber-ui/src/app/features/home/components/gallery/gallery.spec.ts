import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GalleryPhoto } from '../../models/home.models';
import { Gallery } from './gallery';

describe(
  'Gallery',
  (): void => {
    const photos: GalleryPhoto[] = [{ src: 'https://media.test/gallery/flat-top.jpg', alt: 'Flat top' }, { src: 'https://media.test/gallery/burst-fade%20mohawk.png', alt: 'Burst fade mohawk' }];

    function render(input: GalleryPhoto[]): HTMLElement {
      const fixture: ComponentFixture<Gallery> = TestBed.createComponent(Gallery);
      fixture.componentRef.setInput('photos', input);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it(
      'renders a lazy-loaded print per photo, as uploaded',
      (): void => {
        const images: HTMLImageElement[] = Array.from(render(photos).querySelectorAll<HTMLImageElement>('img'));

        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('src'))).toEqual(photos.map((photo: GalleryPhoto): string => photo.src));
        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('alt'))).toEqual(photos.map((photo: GalleryPhoto): string => photo.alt));
        expect(images.every((image: HTMLImageElement): boolean => image.getAttribute('loading') === 'lazy')).toBe(true);
      },
    );

    it(
      'gives every print the same fixed aspect ratio, cropped to fill',
      (): void => {
        const [image]: HTMLImageElement[] = Array.from(render(photos).getElementsByTagName('img'));
        if (!image) {
          throw new Error('No print rendered');
        }
        const style: CSSStyleDeclaration = getComputedStyle(image);

        expect(style.aspectRatio.replaceAll(' ', '')).toBe('4/5');
        expect(style.objectFit).toBe('cover');
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
