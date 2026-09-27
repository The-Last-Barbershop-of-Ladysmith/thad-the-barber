import { type TokenSection } from '@primeuix/themes';

/**
 * Primitive tokens: raw brand values with no meaning attached.
 * Audited from the wireframe's hard-coded colors, radii and fonts.
 * Everything else in the theme references these by name, e.g. `{copper.500}`.
 */
export const primitive: TokenSection = {
  borderRadius: {
    none: '0',
    xs: '2px', // gallery photo frame
    sm: '4px',
    md: '10px', // buttons, inputs, notices
    lg: '14px', // testimonial tiles, media
    xl: '18px', // glass panels, modals
  },

  /** Brand accent. 500 = #E8904A (CTA / eyebrow), 300 = #F4B46E (hover / highlight text). */
  copper: {
    50: '#fdf6ef',
    100: '#fbe9d7',
    200: '#f8d3ae',
    300: '#f4b46e',
    400: '#eea05c',
    500: '#e8904a',
    600: '#d4742f',
    700: '#b05a25',
    800: '#8c4722',
    900: '#713b1f',
    950: '#3d1d0e',
  },

  /** Warm neutral scale, cream (0) to espresso (950). Used as the PrimeNG surface palette. */
  espresso: {
    0: '#fdf8f3',
    50: '#f4e6d8', // primary text
    100: '#e6d6c4', // body copy
    200: '#d8c3ad', // labels
    300: '#cdbba8', // secondary links
    400: '#a8988a', // muted text
    500: '#8a7a6c', // placeholders
    600: '#6d5f54', // disabled
    700: '#4a3a2d',
    800: '#2a1a0e', // gradient mid-stop
    900: '#1d140d', // media wells
    950: '#140d08', // page background
  },

  /** Deepest shade, used for glass panels, header fade and CTA gradient start. */
  ink: '#0d0805',

  /** "Open now" status. */
  mint: '#7fd18b',

  fontFamily: { sans: 'Helvetica, Arial, sans-serif' },
};
