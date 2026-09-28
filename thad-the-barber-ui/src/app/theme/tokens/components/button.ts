import type { ButtonDesignTokens } from '@primeuix/themes/types/button';

/**
 * Every button in the wireframe maps to a PrimeNG button variant, so no custom button component:
 * - primary (default):          gradient-sweep CTA ("Book a cut", "Book online", "Text me")
 * - outlined:                   copper outline that fills on hover (phone number, "Book a kids cut")
 * - secondary + rounded:        glass circle controls (carousel arrows, social icons, menu toggle)
 * - link:                       inline copper links ("Get directions")
 */
export const button: ButtonDesignTokens = {
  root: {
    borderRadius: '{border.radius.md}',
    gap: '0.875rem',
    paddingX: '1.75rem',
    paddingY: '1rem',
    fontSize: '0.9375rem',
    iconOnlyWidth: '3.25rem',
    transitionDuration: '0.35s',
    label: { fontWeight: '700' },
    sm: {
      fontSize: '0.8125rem',
      paddingX: '1rem',
      paddingY: '0.625rem',
      iconOnlyWidth: '2.5rem',
    },
    lg: {
      fontSize: '0.9375rem',
      paddingX: '2rem',
      paddingY: '1.125rem',
      iconOnlyWidth: '3.5rem',
    },
    primary: {
      background: '{primary.color}',
      hoverBackground: '{primary.color}',
      activeBackground: '{primary.active.color}',
      borderColor: 'color-mix(in srgb, {primary.color} 55%, transparent)',
      hoverBorderColor: '{primary.color}',
      activeBorderColor: '{primary.color}',
      color: '{primary.contrast.color}',
      hoverColor: '{text.color}',
      activeColor: '{text.color}',
    },
    secondary: {
      background: 'color-mix(in srgb, {ink} 70%, transparent)',
      hoverBackground: '{primary.color}',
      activeBackground: '{primary.active.color}',
      borderColor: 'color-mix(in srgb, {primary.color} 50%, transparent)',
      hoverBorderColor: '{primary.color}',
      activeBorderColor: '{primary.color}',
      color: '{text.color}',
      hoverColor: '{primary.contrast.color}',
      activeColor: '{primary.contrast.color}',
      focusRing: {
        color: '{primary.color}',
        shadow: 'none',
      },
    },
  },
  outlined: {
    primary: {
      hoverBackground: '{primary.color}',
      activeBackground: '{primary.active.color}',
      borderColor: '{primary.color}',
      color: '{text.color}',
    },
  },
  link: {
    color: '{primary.color}',
    hoverColor: '{primary.hover.color}',
    activeColor: '{primary.active.color}',
  },
  css: `
    .p-button {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      white-space: nowrap;
    }
    .p-button-rounded, .p-button-link { text-transform: none; letter-spacing: 0; }
    .p-button-link { padding-inline: 0; font-weight: 600; }

    /* Primary CTA: dark-to-copper gradient that sweeps on hover (wireframe .cta) */
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link, .p-button-success, .p-button-info, .p-button-warn, .p-button-help, .p-button-danger, .p-button-contrast) {
      background: var(--p-brand-cta-gradient);
      background-size: 260% 100%;
      background-position: 100% 50%;
      box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.6);
      transition: background-position 0.6s var(--p-brand-ease), color 0.4s ease, transform 0.35s var(--p-brand-ease),
        box-shadow 0.35s ease, letter-spacing 0.35s ease, border-color 0.35s ease;
    }
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link, .p-button-success, .p-button-info, .p-button-warn, .p-button-help, .p-button-danger, .p-button-contrast):not(:disabled):hover {
      background: var(--p-brand-cta-gradient);
      background-size: 260% 100%;
      background-position: 0% 50%;
      transform: translateY(-2px);
      letter-spacing: 0.16em;
      box-shadow: var(--p-brand-cta-glow);
    }
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link):not(:disabled):active {
      transform: translateY(-1px);
    }

    /* Outlined: text flips to contrast when the fill comes in */
    .p-button-outlined:not(:disabled):hover { color: var(--p-primary-contrast-color); }

    /* Glass circle controls */
    .p-button-secondary { backdrop-filter: blur(6px); }
  `,
};
