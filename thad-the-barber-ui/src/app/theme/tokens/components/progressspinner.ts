import { ProgressSpinnerDesignTokens } from '@primeuix/themes/types/progressspinner';

/** One light copper arc whose glow breathes as it spins; reduced motion keeps only the spin. */
export const progressspinner: ProgressSpinnerDesignTokens = {
  root: {
    colorOne: '{copper.300}',
    colorTwo: '{copper.300}',
    colorThree: '{copper.300}',
    colorFour: '{copper.300}',
  },
  // PrimeNG sets the svg's animation-duration inline (2s), so the breath keeps the spin's pace.
  css: `
    .p-progressspinner[data-state="indeterminate"] .p-progressspinner-circle {
      overflow: visible;
      animation-name: p-progressspinner-rotate, ttb-spinner-breathe;
      animation-timing-function: linear, ease-in-out;
      animation-iteration-count: infinite;
    }
    .p-progressspinner-circle-track { stroke: transparent; }
    @keyframes ttb-spinner-breathe {
      0%, 100% { filter: drop-shadow(0 0 2px color-mix(in srgb, var(--p-primary-color) 40%, transparent)); }
      50% { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--p-primary-color) 95%, transparent)); }
    }
    @media (prefers-reduced-motion: reduce) {
      .p-progressspinner[data-state="indeterminate"] .p-progressspinner-circle { animation-name: p-progressspinner-rotate; }
    }
  `,
};
