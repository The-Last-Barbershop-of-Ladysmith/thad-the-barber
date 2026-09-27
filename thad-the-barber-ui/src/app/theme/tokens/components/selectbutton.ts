import type { SelectButtonDesignTokens } from '@primeuix/themes/types/selectbutton';
import type { ToggleButtonDesignTokens } from '@primeuix/themes/types/togglebutton';

/**
 * Time-slot picker. SelectButton renders ToggleButtons, so both token sets are tuned here.
 * The css override un-joins the segmented control so the options wrap into a grid.
 */
export const selectbutton: SelectButtonDesignTokens = {
  root: { borderRadius: '{border.radius.sm}' },
  css: `
    .p-selectbutton { display: grid; grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr)); gap: 0.5rem; }
    .p-selectbutton .p-togglebutton,
    .p-selectbutton .p-togglebutton:first-child,
    .p-selectbutton .p-togglebutton:last-child { border-radius: var(--p-selectbutton-border-radius); border-width: 1px; }
  `,
};

export const togglebutton: ToggleButtonDesignTokens = {
  root: {
    padding: '0.75rem 0.25rem',
    borderRadius: '{border.radius.sm}',
    fontWeight: '600',
    fontSize: '0.875rem',
    background: 'color-mix(in srgb, {espresso.50} 16%, transparent)',
    hoverBackground: 'color-mix(in srgb, {espresso.50} 24%, transparent)',
    checkedBackground: '{primary.color}',
    borderColor: 'transparent',
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
  `,
};
