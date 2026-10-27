import { SelectButtonDesignTokens } from '@primeuix/themes/types/selectbutton';
import { ToggleButtonDesignTokens } from '@primeuix/themes/types/togglebutton';

/**
 * Time-slot and date pickers. SelectButton renders ToggleButtons, so both token sets are tuned here.
 * The css override un-joins the segmented control so the options wrap into a grid; the booking page's date list
 * (`date-list`) is one column of bordered rows, the date left and its open count right, two columns from `lg`.
 * A picked day or time gets a copper border and tint rather than a solid fill.
 */
export const selectbutton: SelectButtonDesignTokens = {
  root: { borderRadius: '{border.radius.sm}' },
  css: `
    .p-selectbutton { display: grid; grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr)); gap: 0.5rem; }
    .p-selectbutton .p-togglebutton,
    .p-selectbutton .p-togglebutton:first-child,
    .p-selectbutton .p-togglebutton:last-child { border-radius: var(--p-selectbutton-border-radius); border-width: 1px; }
    .p-selectbutton.date-list { grid-template-columns: minmax(0, 1fr); }
    .p-selectbutton.date-list .p-togglebutton { min-height: 3.25rem; padding: 0.625rem 0.875rem; font-size: 0.9375rem; font-weight: 400; }
    .p-selectbutton.date-list .p-togglebutton-content { width: 100%; justify-content: space-between; gap: 0.75rem; }
    @media (min-width: 64rem) { .p-selectbutton.date-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
};

export const togglebutton: ToggleButtonDesignTokens = {
  root: {
    padding: '0.75rem 0.25rem',
    borderRadius: '{border.radius.sm}',
    fontWeight: '600',
    fontSize: '0.875rem',
    background: 'color-mix(in srgb, {espresso.50} 4%, transparent)',
    hoverBackground: 'color-mix(in srgb, {espresso.50} 10%, transparent)',
    checkedBackground: 'color-mix(in srgb, {primary.color} 14%, transparent)',
    borderColor: 'color-mix(in srgb, {primary.color} 18%, transparent)',
    checkedBorderColor: '{primary.color}',
    color: '{text.color}',
    hoverColor: '{text.hover.color}',
    checkedColor: '{text.color}',
    disabledBackground: 'color-mix(in srgb, {espresso.50} 4%, transparent)',
    disabledBorderColor: 'transparent',
    disabledColor: '{espresso.600}',
  },
  content: {
    padding: '0',
    checkedBackground: 'transparent',
    checkedShadow: 'none',
  },
  css: `
    .p-togglebutton.p-disabled .p-togglebutton-label { text-decoration: line-through; }
  `,
};
