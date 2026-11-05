import { ProgressBarDesignTokens } from '@primeuix/themes/types/progressbar';

/** A thin light copper bar with a glow, on a faint cream track. */
export const progressbar: ProgressBarDesignTokens = {
  root: {
    height: '4px',
    background: 'color-mix(in srgb, {espresso.50} 10%, transparent)',
    borderRadius: '999px',
  },
  value: {
    background: '{copper.300}',
  },
  // The root's overflow would cut the glow to the 4px track, so it clips sideways only. clip-path doesn't change what
  // the page scrolls, so the sliding bar would widen it while it passes the edge; overflow-x does.
  css: `
    .p-progressbar-indeterminate {
      overflow: visible;
      overflow-x: clip;
      clip-path: inset(-12px 0);
    }
    .p-progressbar-indeterminate .p-progressbar-value::before,
    .p-progressbar-indeterminate .p-progressbar-value::after {
      border-radius: inherit;
      box-shadow: 0 0 10px color-mix(in srgb, var(--p-primary-300) 80%, transparent);
    }
  `,
};
