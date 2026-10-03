import { GalleriaDesignTokens } from '@primeuix/themes/types/galleria';

/** Full-screen gallery lightbox: glass circle nav/close buttons that fill copper on hover. */
const glassButton: Record<string, string> = {
  background: 'color-mix(in srgb, {ink} 70%, transparent)',
  hoverBackground: '{primary.color}',
  color: '{text.color}',
  hoverColor: '{primary.contrast.color}',
};

export const galleria: GalleriaDesignTokens = {
  root: { borderWidth: '0', borderRadius: '{border.radius.xs}' },
  navButton: {
    ...glassButton,
    size: '3.25rem',
    gutter: '1.25rem',
  },
  closeButton: {
    ...glassButton,
    size: '2.75rem',
    gutter: '1.25rem',
  },
  caption: {
    background: 'transparent',
    color: '{espresso.300}',
    padding: '0.875rem',
  },
  css: `
    .p-galleria-nav-button, .p-galleria-close-button {
      border: 1px solid color-mix(in srgb, var(--p-primary-color) 50%, transparent);
    }
  `,
};
