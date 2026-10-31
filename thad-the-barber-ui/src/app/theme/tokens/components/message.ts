import { MessageDesignTokens } from '@primeuix/themes/types/message';
import { SEVERITY_COLORS, Severity, severityTokens } from './severity';

function severity(name: Severity): MessageDesignTokens['info'] {
  const color: string = SEVERITY_COLORS[name];
  return {
    ...severityTokens(color),
    // The tint sits on solid ink, not on whatever is behind the card, so the text stays readable (as the wireframe's
    // "You're booked" box does).
    background: `color-mix(in srgb, ${color} 14%, {ink})`,
    outlined: { color, borderColor: color },
    simple: { color },
  };
}

/** Inline notices: field errors, "slot just taken", "You're booked". */
export const message: MessageDesignTokens = {
  root: { borderRadius: '{border.radius.md}' },
  content: { padding: '0.875rem 1.125rem', gap: '0.625rem' },
  text: { fontWeight: '600' },
  icon: { size: '1.5rem' },
  info: severity('info'),
  success: severity('success'),
  warn: severity('warn'),
  error: severity('error'),
  // Notices run to several lines (title, text, help line, retry), so the icon sits by the first line, not the middle.
  css: `
    .p-message-content {
      align-items: flex-start;
    }
  `,
};
