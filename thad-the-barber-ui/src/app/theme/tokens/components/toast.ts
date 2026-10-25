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
};
