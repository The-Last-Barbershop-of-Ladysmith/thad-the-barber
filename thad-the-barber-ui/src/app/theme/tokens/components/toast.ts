import { ToastDesignTokens } from '@primeuix/themes/types/toast';
import { SEVERITY_COLORS, Severity, severityTokens } from './severity';

/** Opaque, so the text keeps its contrast over the moving backdrop. */
function severity(name: Severity): ToastDesignTokens['info'] {
  const color: string = SEVERITY_COLORS[name];
  return {
    ...severityTokens(color),
    background: `color-mix(in srgb, ${color} 14%, {overlay.popover.background})`,
    detailColor: '{text.color}',
  };
}

/** Short results not tied to one spot on the page ("Link copied", "Booking cancelled"). */
export const toast: ToastDesignTokens = {
  summary: { fontWeight: '600' },
  detail: { fontWeight: '400', fontSize: '0.875rem' },
  info: severity('info'),
  success: severity('success'),
  warn: severity('warn'),
  error: severity('error'),
  css: `
    /* PrimeNG pins the close button 0.25rem from the corner; inset it like the text, level with its first line. */
    .p-toast-close-button {
      top: var(--p-toast-content-padding);
      right: var(--p-toast-content-padding);
    }
    .p-toast-message-content {
      padding-inline-end: calc(var(--p-toast-content-padding) + var(--p-toast-close-button-width) + var(--p-toast-content-gap));
    }
    .p-toast-message-text {
      text-wrap: pretty;
    }
  `,
};
