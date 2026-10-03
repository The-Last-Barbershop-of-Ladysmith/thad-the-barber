import { CarouselDesignTokens } from '@primeuix/themes/types/carousel';

/** Announcements slider: copper ring dots, filled when active. */
export const carousel: CarouselDesignTokens = {
  root: { transitionDuration: '0.7s' },
  indicatorList: { padding: '1.5rem 0 0', gap: '0.75rem' },
  indicator: {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '50%',
    background: 'transparent',
    hoverBackground: 'color-mix(in srgb, {primary.color} 40%, transparent)',
    activeBackground: '{primary.color}',
  },
  css: `
    .p-carousel-indicator-button { border: 1.5px solid var(--p-primary-color); transition: transform 0.3s ease, background 0.3s ease; }
    .p-carousel-indicator-button.p-carousel-indicator-active {
      background: var(--p-carousel-indicator-active-background);
      transform: scale(1.25);
    }
  `,
};
