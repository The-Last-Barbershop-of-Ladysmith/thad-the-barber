import { SelectButtonDesignTokens } from '@primeuix/themes/types/selectbutton';
import { ToggleButtonDesignTokens } from '@primeuix/themes/types/togglebutton';

/**
 * Time-slot and date pickers. SelectButton renders ToggleButtons, so both token sets are tuned here.
 * The css override un-joins the segmented control so the options wrap into a grid. `option-list` lays the options out
 * as full-width rows, the label left and any detail right, two columns from `lg` (the booking date list).
 * A picked time is solid copper with dark text.
 */
export const selectbutton: SelectButtonDesignTokens = {
  root: { borderRadius: '0.625rem' },
  css: `
    .p-selectbutton { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.125rem, 1fr)); gap: 0.625rem; }
    .p-selectbutton .p-togglebutton,
    .p-selectbutton .p-togglebutton:first-child,
    .p-selectbutton .p-togglebutton:last-child { border-radius: 0.625rem; border-width: 1px; height: 3.25rem; }
    .p-selectbutton.option-list { grid-template-columns: minmax(0, 1fr); }
    .p-selectbutton.option-list .p-togglebutton { min-height: 3.25rem; padding: 0.625rem 0.875rem; font-size: 0.9375rem; font-weight: 400; }
    .p-selectbutton.option-list .p-togglebutton-content { width: 100%; justify-content: space-between; gap: 0.75rem; }
    @media (min-width: 64rem) { .p-selectbutton.option-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
};

export const togglebutton: ToggleButtonDesignTokens = {
  root: {
    padding: '0.75rem 0.25rem',
    borderRadius: '0.625rem',
    fontWeight: '600',
    fontSize: '0.9375rem',
    background: '{brand.controlBackground}',
    hoverBackground: 'color-mix(in srgb, {espresso.50} 10%, {brand.controlBackground})',
    checkedBackground: '{primary.color}',
    borderColor: 'color-mix(in srgb, {espresso.50} 14%, transparent)',
    checkedBorderColor: '{primary.color}',
    color: '{text.color}',
    hoverColor: '{text.hover.color}',
    checkedColor: '{primary.contrast.color}',
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
    .p-togglebutton.p-togglebutton-checked,
    .p-togglebutton.p-togglebutton-checked:not(.p-disabled):hover { background: var(--p-primary-color); font-weight: 800; }
  `,
};
