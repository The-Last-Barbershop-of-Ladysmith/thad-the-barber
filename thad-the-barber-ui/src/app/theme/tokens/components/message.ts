import { MessageDesignTokens } from '@primeuix/themes/types/message';

/**
 * Inline notices ("You're on the list", "You're booked"). The app has no blue "info" state,
 * so severity="info" is re-skinned as the copper brand notice.
 */
export const message: MessageDesignTokens = {
  root: { borderRadius: '{border.radius.md}' },
  content: { padding: '0.875rem 1.125rem', gap: '0.625rem' },
  text: { fontWeight: '600' },
  info: {
    background: 'color-mix(in srgb, {primary.color} 14%, transparent)',
    borderColor: 'color-mix(in srgb, {primary.color} 40%, transparent)',
    color: '{primary.hover.color}',
    shadow: 'none',
  },
};
