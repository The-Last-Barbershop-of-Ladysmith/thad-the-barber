import { CarouselDesignTokens } from '@primeuix/themes/types/carousel';

/** Announcements slider: a row of short bars under the slide, the active one longer and copper. */
export const carousel: CarouselDesignTokens = {
  root: { transitionDuration: '0.7s' },
  indicatorList: { padding: '0', gap: '0.5rem' },
  indicator: {
    width: '0.75rem',
    height: '0.25rem',
    borderRadius: '0.125rem',
    background: 'color-mix(in srgb, {text.color} 25%, transparent)',
    hoverBackground: 'color-mix(in srgb, {primary.color} 40%, transparent)',
    activeBackground: '{primary.color}',
  },
  css: `
    .p-carousel-indicator-button { transition: width 0.3s ease, background 0.3s ease; }
    .p-carousel-indicator-button.p-carousel-indicator-active { width: 2rem; }
  `,
};
