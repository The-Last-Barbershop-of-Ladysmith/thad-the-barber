import { type TokenSection } from '@primeuix/themes';

/**
 * Semantic tokens: give primitives a job (primary, surface, text, form fields...).
 * The site has a single dark look, so values are set directly rather than with light-dark().
 * `extend` holds brand-only tokens PrimeNG has no slot for; they become CSS variables
 * (for example `--p-brand-glass-background`) that `tailwind/theme.css` exposes as utilities.
 */
function alpha(
  token: string,
  percent: number,
): string {
  return `color-mix(in srgb, ${token} ${percent}%, transparent)`;
}

export const semantic: TokenSection = {
  typography: {
    fontFamily: '{font.family.sans}',
    fontSize: '1rem',
  },

  transitionDuration: '0.25s',

  focusRing: {
    width: '2px',
    style: 'solid',
    color: '{primary.color}',
    offset: '2px',
    shadow: 'none',
  },

  primary: {
    50: '{copper.50}',
    100: '{copper.100}',
    200: '{copper.200}',
    300: '{copper.300}',
    400: '{copper.400}',
    500: '{copper.500}',
    600: '{copper.600}',
    700: '{copper.700}',
    800: '{copper.800}',
    900: '{copper.900}',
    950: '{copper.950}',
    color: '{copper.500}',
    contrastColor: '{espresso.950}',
    hoverColor: '{copper.300}',
    activeColor: '{copper.400}',
  },

  surface: {
    0: '{espresso.0}',
    50: '{espresso.50}',
    100: '{espresso.100}',
    200: '{espresso.200}',
    300: '{espresso.300}',
    400: '{espresso.400}',
    500: '{espresso.500}',
    600: '{espresso.600}',
    700: '{espresso.700}',
    800: '{espresso.800}',
    900: '{espresso.900}',
    950: '{espresso.950}',
  },

  text: {
    color: '{espresso.50}',
    hoverColor: '{espresso.0}',
    mutedColor: '{espresso.400}',
    hoverMutedColor: '{espresso.200}',
  },

  content: {
    background: alpha(
      '{ink}',
      76,
    ),
    hoverBackground: alpha(
      '{espresso.50}',
      6,
    ),
    borderColor: alpha(
      '{copper.500}',
      22,
    ),
    color: '{text.color}',
    hoverColor: '{text.hover.color}',
    borderRadius: '{border.radius.md}',
  },

  formField: {
    paddingX: '1.125rem',
    paddingY: '0.875rem',
    fontSize: '1rem',
    borderRadius: '{border.radius.md}',
    background: alpha(
      '{espresso.50}',
      6,
    ),
    filledBackground: alpha(
      '{espresso.50}',
      6,
    ),
    filledHoverBackground: alpha(
      '{espresso.50}',
      8,
    ),
    filledFocusBackground: alpha(
      '{espresso.50}',
      8,
    ),
    disabledBackground: alpha(
      '{espresso.50}',
      4,
    ),
    borderColor: alpha(
      '{copper.500}',
      45,
    ),
    hoverBorderColor: alpha(
      '{copper.500}',
      70,
    ),
    focusBorderColor: '{primary.color}',
    color: '{text.color}',
    disabledColor: '{espresso.600}',
    placeholderColor: '{espresso.500}',
    floatLabelColor: '{espresso.400}',
    floatLabelFocusColor: '{primary.color}',
    floatLabelActiveColor: '{espresso.400}',
    iconColor: '{espresso.400}',
    shadow: 'none',
  },

  highlight: {
    background: alpha(
      '{copper.500}',
      14,
    ),
    focusBackground: alpha(
      '{copper.500}',
      24,
    ),
    color: '{copper.300}',
    focusColor: '{copper.200}',
  },

  mask: {
    background: 'rgba(8, 5, 3, 0.92)',
    color: '{espresso.200}',
  },

  overlay: {
    modal: {
      background: '{espresso.950}',
      borderColor: '{content.border.color}',
      borderRadius: '{border.radius.xl}',
      color: '{text.color}',
    },
    popover: {
      background: '{espresso.950}',
      borderColor: '{content.border.color}',
      color: '{text.color}',
    },
  },

  extend: {
    brand: {
      glass: {
        background: alpha(
          '{ink}',
          76,
        ),
        strongBackground: alpha(
          '{ink}',
          86,
        ),
        blur: '12px',
      },
      tile: {
        background: alpha(
          '{espresso.50}',
          4,
        ),
        borderColor: alpha(
          '{copper.500}',
          18,
        ),
      },
      divider: alpha(
        '{copper.500}',
        15,
      ),
      headerFade: `linear-gradient(180deg, ${alpha(
        '{ink}',
        92,
      )} 0%, ${alpha(
        '{ink}',
        60,
      )} 55%, transparent 100%)`,
      ctaGradient: 'linear-gradient(100deg, {ink} 0%, {espresso.800} 30%, {copper.500} 65%, {copper.300} 100%)',
      ctaGlow: `0 16px 36px -10px ${alpha(
        '{copper.500}',
        80,
      )}`,
      success: '{mint}',
      ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    },
  },
};
