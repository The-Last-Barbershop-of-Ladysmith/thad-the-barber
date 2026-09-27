import type { DrawerDesignTokens } from '@primeuix/themes/types/drawer';

/** Mobile navigation sheet. */
export const drawer: DrawerDesignTokens = {
  root: {
    background: '{brand.glass.strong.background}',
    borderColor: '{content.border.color}',
    shadow: 'none',
  },
  header: { padding: '1rem' },
  content: { padding: '0 1.5rem 1.5rem' },
  css: `
    .p-drawer {
      backdrop-filter: blur(var(--p-brand-glass-blur));
      -webkit-backdrop-filter: blur(var(--p-brand-glass-blur));
    }
  `,
};
