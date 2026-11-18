import { ToastDesignTokens } from '@primeuix/themes/types/toast';
import { alpha } from '../alpha';

export type Severity = 'info' | 'success' | 'warn' | 'error';

/** `info` is blue, so it never reads as the copper brand accent or as a warning. */
export const SEVERITY_COLORS: Record<Severity, string> = {
  info: '{brand.info}',
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
