import { ToastDesignTokens } from '@primeuix/themes/types/toast';

type ToastSeverityTokens = ToastDesignTokens['info'];

/** Opaque, so the text keeps its contrast over the moving backdrop. */
function severity(color: string): ToastSeverityTokens {
  return {
    background: `color-mix(in srgb, ${color} 14%, {espresso.950})`,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
    color,
    detailColor: '{text.color}',
    shadow: 'none',
    closeButton: {
      hoverBackground: `color-mix(in srgb, ${color} 14%, transparent)`,
      focusRing: { color, shadow: 'none' },
    },
  };
}

/** Short results not tied to one spot on the page ("Link copied", "Booking cancelled"). */
export const toast: ToastDesignTokens = {
  root: { borderRadius: '{border.radius.md}' },
  summary: { fontWeight: '600' },
  detail: { fontWeight: '400', fontSize: '0.875rem' },
  info: severity('{primary.hover.color}'),
  success: severity('{brand.success}'),
  warn: severity('{brand.warn}'),
  error: severity('{brand.error}'),
};
