import { ToastDesignTokens } from '@primeuix/themes/types/toast';
import { alpha } from '../alpha';

export type Severity = 'info' | 'success' | 'warn' | 'error';

/** The app has no blue state, so `info` is the copper brand notice. */
export const SEVERITY_COLORS: Record<Severity, string> = {
  info: '{primary.hover.color}',
  success: '{brand.success}',
  warn: '{brand.warn}',
  error: '{brand.error}',
};

type SharedSeverityTokens = Pick<NonNullable<ToastDesignTokens['info']>, 'borderColor' | 'color' | 'shadow' | 'closeButton'>;

/** What `p-message` and `p-toast` share per severity, so the two always match. */
export function severityTokens(color: string): SharedSeverityTokens {
  return {
    borderColor: alpha(color, 40),
    color,
    shadow: 'none',
    closeButton: { hoverBackground: alpha(color, 14), focusRing: { color } },
  };
}
