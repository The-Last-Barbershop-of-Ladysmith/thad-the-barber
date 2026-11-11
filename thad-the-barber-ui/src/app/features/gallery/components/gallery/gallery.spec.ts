import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { GalleryPhoto } from '../../models/gallery-photo.model';
import * as GalleryActions from '../../state/gallery.actions';
import { galleryFeature } from '../../state/gallery.feature';
import { Gallery } from './gallery';

describe(
  'Gallery',
  (): void => {
    const photos: GalleryPhoto[] = [{ src: 'https://media.test/gallery/flat-top.jpg', alt: 'Flat top' }, { src: 'https://media.test/gallery/burst-fade%20mohawk.png', alt: 'Burst fade mohawk' }];

    function render(listed: GalleryPhoto[]): ComponentFixture<Gallery> {
      TestBed.configureTestingModule({ providers: [provideStore({ [galleryFeature.name]: galleryFeature.reducer })] });
      TestBed.inject(Store).dispatch(GalleryActions.GalleryRequestSuccess({ photos: listed }));
      const fixture: ComponentFixture<Gallery> = TestBed.createComponent(Gallery);
      fixture.detectChanges();
      return fixture;
    }

    function openPrint(fixture: ComponentFixture<Gallery>, index: number): HTMLButtonElement {
      const prints: HTMLButtonElement[] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.print-button'));
      const print: HTMLButtonElement | undefined = prints[index];
      if (!print) {
        throw new Error(`No print ${index} rendered`);
      }
      print.click();
      fixture.detectChanges();
      return print;
    }

    function pressEscape(fixture: ComponentFixture<Gallery>): void {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
    }

    it(
      'renders a lazy-loaded print per photo, as uploaded',
      (): void => {
        const images: HTMLImageElement[] = Array.from((render(photos).nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('img'));

        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('src'))).toEqual(photos.map((photo: GalleryPhoto): string => photo.src));
        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('alt'))).toEqual(photos.map((photo: GalleryPhoto): string => photo.alt));
        expect(images.every((image: HTMLImageElement): boolean => image.getAttribute('loading') === 'lazy')).toBe(true);
      },
    );

    it(
      'gives every print the same fixed aspect ratio, cropped to fill',
      (): void => {
        const [image]: HTMLImageElement[] = Array.from((render(photos).nativeElement as HTMLElement).getElementsByTagName('img'));
        if (!image) {
          throw new Error('No print rendered');
        }
        const style: CSSStyleDeclaration = getComputedStyle(image);

        expect(style.aspectRatio.replaceAll(' ', '')).toBe('4/5');
        expect(style.objectFit).toBe('cover');
      },
    );

    it(
      'opens the lightbox on the print that was clicked, and counts from it',
      (): void => {
        openPrint(render(photos), 1);

        expect(document.querySelector('[data-testid="lightbox-count"]')?.textContent.trim()).toBe('2 / 2');
      },
    );

    it(
      'closes the lightbox on Escape and returns focus to the print that opened it',
      (): void => {
        const fixture: ComponentFixture<Gallery> = render(photos);
        const opener: HTMLButtonElement = openPrint(fixture, 1);

        pressEscape(fixture);

        expect(document.querySelector('[data-testid="lightbox-count"]')).toBeNull();
        expect(document.activeElement).toBe(opener);
      },
    );

    it(
      'says there are no photos instead of hiding the section',
      (): void => {
        const element: HTMLElement = render([]).nativeElement as HTMLElement;

        expect(element.querySelector('[data-testid="gallery-empty"]')).not.toBeNull();
        expect(element.querySelector('.print')).toBeNull();
      },
    );

    it(
      'holds the section with a placeholder until the photos load',
      (): void => {
        TestBed.configureTestingModule({
          providers: [provideStore({ [galleryFeature.name]: galleryFeature.reducer })],
        });
        TestBed.inject(Store).dispatch(GalleryActions.GalleryRequest());
        const fixture: ComponentFixture<Gallery> = TestBed.createComponent(Gallery);
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('[data-testid="gallery-loading"]')).not.toBeNull();
        expect(element.querySelector('[data-testid="gallery-empty"]')).toBeNull();
      },
    );
  },
);
