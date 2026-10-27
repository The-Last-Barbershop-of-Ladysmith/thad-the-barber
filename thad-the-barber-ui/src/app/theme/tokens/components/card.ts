import { CardDesignTokens } from '@primeuix/themes/types/card';

/** p-card is the frosted "glass panel" that wraps every section in the wireframe. */
export const card: CardDesignTokens = {
  root: {
    background: '{brand.glass.strong.background}',
    borderRadius: '{border.radius.xl}',
    color: '{text.color}',
    shadow: 'none',
  },
  body: { padding: 'clamp(1.25rem, 4vw, 3rem)', gap: '2rem' },
  css: `
    .p-card {
      border: 1px solid var(--p-content-border-color);
      backdrop-filter: blur(var(--p-brand-glass-blur));
      -webkit-backdrop-filter: blur(var(--p-brand-glass-blur));
    }
    .p-card.is-open, .p-card.step-panel { border-color: color-mix(in srgb, var(--p-primary-color) 55%, transparent); }
    .p-card.step-card .p-card-body { padding: 0; gap: 0; }
    .p-card.step-rail .p-card-body { padding: 1.25rem; }
    .p-card.step-panel .p-card-body { padding: 1.75rem; }
  `,
};
