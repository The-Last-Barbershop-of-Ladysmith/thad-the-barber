import { ThemeOptions, definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { components } from './tokens/components';
import { primitive } from './tokens/primitive';
import { semantic } from './tokens/semantic';

/** Aura with Thad The Barber's primitive, semantic and component tokens layered on top. */
export const ThadPreset: typeof Aura = definePreset(
  Aura,
  {
    primitive,
    semantic,
    components,
  },
);

/** Class toggled on <html> to activate the dark scheme. The site ships dark-only. */
export const DARK_MODE_CLASS: string = 'app-dark';

/**
 * PrimeNG theme options. Styles go in the `primeng` cascade layer, which `tailwind/theme.css`
 * orders after Tailwind's base and before its utilities, so a utility class always wins.
 */
export const themeOptions: ThemeOptions = {
  prefix: 'p',
  darkModeSelector: `.${DARK_MODE_CLASS}`,
  cssLayer: { name: 'primeng', order: 'theme, base, primeng, components, utilities' },
};
