import { ButtonDesignTokens } from '@primeuix/themes/types/button';

/**
 * Every button in the wireframe maps to a PrimeNG button variant, so no custom button component:
 * - primary (default):          solid copper CTA with a glow and a border trace on hover ("Book a cut", "Text me")
 * - outlined:                   copper outline that fills on hover (phone number, "Book a kids cut")
 * - secondary + rounded:        glass circle controls (carousel arrows, social icons, menu toggle)
 * - link:                       inline copper links ("Get directions")
 */
export const button: ButtonDesignTokens = {
  root: {
    borderRadius: '{border.radius.md}',
    gap: '0.875rem',
    paddingX: '1.5rem',
    paddingY: '1rem',
    fontSize: '0.9375rem',
    iconOnlyWidth: '3.25rem',
    transitionDuration: '0.35s',
    label: { fontWeight: '800' },
    sm: {
      fontSize: '0.8125rem',
      paddingX: '1rem',
      paddingY: '0.625rem',
      iconOnlyWidth: '2.5rem',
    },
    lg: {
      fontSize: '0.9375rem',
      paddingX: '1.875rem',
      paddingY: '1.125rem',
      iconOnlyWidth: '3.5rem',
    },
    primary: {
      background: '{primary.color}',
      hoverBackground: '{copper.600}',
      activeBackground: '{primary.active.color}',
      borderColor: '{primary.color}',
      hoverBorderColor: '{copper.600}',
      activeBorderColor: '{primary.active.color}',
      color: '{primary.contrast.color}',
      hoverColor: '{primary.contrast.color}',
      activeColor: '{primary.contrast.color}',
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
      focusRing: { color: '{primary.color}', shadow: 'none' },
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
      letter-spacing: 0.12em;
      white-space: nowrap;
    }
    .p-button-rounded, .p-button-link, .p-button-text { text-transform: none; letter-spacing: 0; }
    .p-button-link { padding-inline: 0; }
    /* PrimeNG sizes small and large icons through .p-button-icon, which only the deprecated pButtonIcon adds */
    .p-button-sm > .pi, .p-button-lg > .pi { font-size: inherit; }

    /* Primary CTA: solid copper with a glow; on hover it darkens, the glow grows and a light copper line runs round its edge.
       The glow is a shadow and the line is absolutely placed over the border, so the button never changes size.
       PrimeNG's .p-button clips its overflow for the ripple, which this app turns off, so the line can show past the edge. */
    @property --p-brand-trace-angle {
      syntax: '<angle>';
      inherits: false;
      initial-value: 0deg;
    }
    @keyframes p-brand-button-trace {
      to { --p-brand-trace-angle: 360deg; }
    }
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link, .p-button-success, .p-button-info, .p-button-warn, .p-button-help, .p-button-danger, .p-button-contrast) {
      position: relative;
      overflow: visible;
      box-shadow: var(--p-brand-cta-glow);
      transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
    }
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link, .p-button-success, .p-button-info, .p-button-warn, .p-button-help, .p-button-danger, .p-button-contrast)::before {
      content: '';
      position: absolute;
      inset: -2px;
      padding: 2px;
      border-radius: calc(var(--p-button-border-radius) + 1px);
      background: conic-gradient(from var(--p-brand-trace-angle), transparent 0 60%, var(--p-copper-200) 88%, transparent);
      mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
      opacity: 0;
      transition: opacity 0.35s ease;
      pointer-events: none;
    }
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link, .p-button-success, .p-button-info, .p-button-warn, .p-button-help, .p-button-danger, .p-button-contrast):not(:disabled):hover {
      box-shadow: var(--p-brand-cta-glow-hover);
    }
    .p-button:not(.p-button-secondary, .p-button-outlined, .p-button-text, .p-button-link, .p-button-success, .p-button-info, .p-button-warn, .p-button-help, .p-button-danger, .p-button-contrast):not(:disabled):hover::before {
      opacity: 1;
      animation: p-brand-button-trace 1.8s linear infinite;
    }
    .p-button:disabled { box-shadow: none; }
    @media (prefers-reduced-motion: reduce) {
      .p-button:not(:disabled):hover::before { animation: none; }
    }

    /* Outlined: text flips to contrast when the fill comes in */
    .p-button-outlined:not(:disabled):hover { color: var(--p-primary-contrast-color); }

    /* Glass circle controls */
    .p-button-secondary { backdrop-filter: blur(6px); }
  `,
};
