import { environment } from '../../../environments/environment';
import { mediaSrcset, mediaUrl } from './media.utils';

describe(
  'media utils',
  (): void => {
    const base: string = environment.mediaBaseUrl;

    it(
      'builds a variant URL from mediaBaseUrl, folder, key and size',
      (): void => {
        expect(mediaUrl(
          'gallery',
          'fade-07',
          'md',
        )).toBe(`${base}/gallery/fade-07-md.webp`);
      },
    );

    it(
      'lists every variant at its own width for a large original',
      (): void => {
        expect(mediaSrcset(
          'gallery',
          'big',
          4032,
        )).toBe(
          `${base}/gallery/big-sm.webp 480w, ${base}/gallery/big-md.webp 960w, ${base}/gallery/big-lg.webp 1600w`,
        );
      },
    );

    it(
      'stops at the first variant capped by the original width, at the real width',
      (): void => {
        expect(mediaSrcset(
          'gallery',
          'mid',
          720,
        )).toBe(`${base}/gallery/mid-sm.webp 480w, ${base}/gallery/mid-md.webp 720w`);
      },
    );

    it(
      'keeps an original exactly at a variant width once',
      (): void => {
        expect(mediaSrcset(
          'gallery',
          'even',
          960,
        )).toBe(`${base}/gallery/even-sm.webp 480w, ${base}/gallery/even-md.webp 960w`);
      },
    );

    it(
      'lists only sm for an original narrower than every variant',
      (): void => {
        expect(mediaSrcset(
          'gallery',
          'tiny',
          300,
        )).toBe(`${base}/gallery/tiny-sm.webp 300w`);
      },
    );
  },
);
