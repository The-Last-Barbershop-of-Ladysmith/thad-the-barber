import { Theme } from '@primeuix/themes';
import { ThadPreset, themeOptions } from './thad-preset';

/**
 * The theme's primitive and semantic CSS variables (`--p-copper-500`, `--p-brand-glass-background`, …) as a stylesheet
 * for pages outside Angular: the startup loader and Express's error pages. PrimeNG's own generator builds them, so
 * they match what it injects at runtime. Unlayered, so a plain stylesheet can use them.
 */
export function brandCss(): string {
  Theme.setTheme({ preset: ThadPreset, options: { ...themeOptions, cssLayer: false } });
  const { primitive, semantic }: ReturnType<typeof Theme.getCommon> = Theme.getCommon();
  return `${primitive.css ?? ''}\n${semantic.css ?? ''}\n`;
}
