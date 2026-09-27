import type { DatePickerDesignTokens } from '@primeuix/themes/types/datepicker';

/** Booking calendar: square tiles, copper selection, struck-through unavailable days. */
export const datepicker: DatePickerDesignTokens = {
  panel: {
    background: '{brand.glass.background}',
    borderRadius: '{border.radius.xl}',
    padding: '1rem',
    shadow: 'none',
  },
  header: {
    background: 'transparent',
    padding: '0 0 0.75rem 0',
  },
  title: { fontWeight: '700' },
  weekDay: {
    color: '{espresso.200}',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  date: {
    width: '100%',
    height: 'auto',
    borderRadius: '{border.radius.sm}',
    padding: '0',
    hoverBackground: '{primary.hover.color}',
    hoverColor: '{primary.contrast.color}',
    selectedBackground: '{primary.color}',
    selectedColor: '{primary.contrast.color}',
    color: '{text.color}',
  },
  today: {
    background: 'color-mix(in srgb, {espresso.50} 16%, transparent)',
    color: '{text.color}',
  },
  css: `
    .p-datepicker-inline { width: 100%; backdrop-filter: blur(var(--p-brand-glass-blur)); }
    .p-datepicker-day-view { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 6px; }
    .p-datepicker-day-cell { padding: 0; }
    .p-datepicker-day { aspect-ratio: 1; width: 100%; background: color-mix(in srgb, var(--p-espresso-50) 16%, transparent); }
    .p-datepicker-day.p-disabled {
      background: color-mix(in srgb, var(--p-espresso-50) 4%, transparent);
      color: var(--p-espresso-600);
      text-decoration: line-through;
      opacity: 1;
    }
    .p-datepicker-other-month .p-datepicker-day { visibility: hidden; }
  `,
};
