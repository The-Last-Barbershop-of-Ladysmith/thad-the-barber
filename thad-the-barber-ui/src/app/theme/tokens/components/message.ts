import { MessageDesignTokens } from '@primeuix/themes/types/message';
import { alpha } from '../alpha';
import { SEVERITY_COLORS, Severity, severityTokens } from './severity';

function severity(name: Severity): MessageDesignTokens['info'] {
  const color: string = SEVERITY_COLORS[name];
  return {
    ...severityTokens(color),
    background: alpha(color, 14),
    outlined: { color, borderColor: color },
    simple: { color },
  };
}

/** Inline notices: field errors, "slot just taken", "You're booked". */
export const message: MessageDesignTokens = {
  root: { borderRadius: '{border.radius.md}' },
  content: { padding: '0.875rem 1.125rem', gap: '0.625rem' },
  text: { fontWeight: '600' },
  info: severity('info'),
  success: severity('success'),
  warn: severity('warn'),
  error: severity('error'),
};
