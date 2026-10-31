import { DialogDesignTokens } from '@primeuix/themes/types/dialog';

/** Modal dialogs (the booking page's "Leave without booking?" p-confirmdialog), glass like the cards and drawer. */
export const dialog: DialogDesignTokens = {
  root: {
    background: '{brand.glass.strong.background}',
    shadow: 'none',
  },
  title: { fontSize: '1.25rem', fontWeight: '600' },
  css: `
    .p-dialog {
      width: min(28rem, calc(100vw - 2rem));
      backdrop-filter: blur(var(--p-brand-glass-blur));
      -webkit-backdrop-filter: blur(var(--p-brand-glass-blur));
    }
  `,
};
