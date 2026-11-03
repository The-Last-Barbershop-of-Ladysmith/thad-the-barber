import { DialogDesignTokens } from '@primeuix/themes/types/dialog';

/** Modal dialogs (the booking page's "Leave without booking?" p-confirmdialog), glass like the cards and drawer. */
export const dialog: DialogDesignTokens = {
  root: {
    background: '{brand.glass.strong.background}',
    shadow: 'none',
  },
  title: { fontSize: '1.25rem', fontWeight: '600' },
  footer: { gap: '0.75rem' },
  css: `
    .p-dialog {
      width: min(28rem, calc(100vw - 2rem));
      backdrop-filter: blur(var(--p-brand-glass-blur));
      -webkit-backdrop-filter: blur(var(--p-brand-glass-blur));
    }
    /* Stacked on phones: two uppercase, wide-tracked labels don't fit side by side; from lg the dialog widens for a row. */
    .p-dialog-footer {
      flex-direction: column;
    }
    .p-dialog-footer .p-button {
      width: 100%;
    }
    @media (min-width: 64rem) {
      .p-dialog {
        width: 38rem;
      }
      .p-dialog-footer {
        flex-direction: row;
        justify-content: space-between;
      }
      .p-dialog-footer .p-button {
        width: auto;
      }
    }
  `,
};
