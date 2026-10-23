import { MessageDesignTokens } from '@primeuix/themes/types/message';

type MessageSeverityTokens = MessageDesignTokens['info'];

function severity(color: string): MessageSeverityTokens {
  return {
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
    color,
    shadow: 'none',
    closeButton: {
      hoverBackground: `color-mix(in srgb, ${color} 14%, transparent)`,
      focusRing: { color, shadow: 'none' },
    },
    outlined: { color, borderColor: color },
    simple: { color },
  };
}

/**
 * Inline notices: field errors, "slot just taken", "You're booked". The app has no blue state,
 * so severity="info" is re-skinned as the copper brand notice.
 */
export const message: MessageDesignTokens = {
  root: { borderRadius: '{border.radius.md}' },
  content: { padding: '0.875rem 1.125rem', gap: '0.625rem' },
  text: { fontWeight: '600' },
  info: severity('{primary.hover.color}'),
  success: severity('{brand.success}'),
  warn: severity('{brand.warn}'),
  error: severity('{brand.error}'),
};
