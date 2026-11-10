import { GalleryDesignTokens } from '@primeuix/themes/types/gallery';

/** Full-screen lightbox: ink backdrop, and glass circle buttons that fill copper on hover. */
const glassButton: Record<string, string> = {
  background: 'color-mix(in srgb, {ink} 70%, transparent)',
  color: '{text.color}',
  hoverBackground: '{primary.color}',
  hoverColor: '{primary.contrast.color}',
};

export const gallery: GalleryDesignTokens = {
  backdrop: { background: '{ink}' },
  header: {
    padding: '1rem 1.25rem',
    background: 'transparent',
  },
  footer: {
    padding: '1rem',
    background: 'transparent',
    borderColor: 'transparent',
  },
  action: {
    ...glassButton,
    size: '2.75rem',
  },
  navigation: {
    ...glassButton,
    size: '3.25rem',
    offset: '1.25rem',
  },
  css: `
    .p-gallery-action, .p-gallery-prev, .p-gallery-next {
      border: 1px solid color-mix(in srgb, var(--p-primary-color) 50%, transparent);
    }
  `,
};
