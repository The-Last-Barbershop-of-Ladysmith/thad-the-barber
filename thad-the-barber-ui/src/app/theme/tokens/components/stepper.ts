import { StepperDesignTokens } from '@primeuix/themes/types/stepper';

/**
 * The booking steps. Phones get rows: a numbered circle (a check once the step has its pick), then the title and the
 * pick. From lg they're tabs: a small number (a check after it when done), the title and the pick under it, and a
 * copper line under the current one. Panels sit on the page, not their own surface.
 */
export const stepper: StepperDesignTokens = {
  root: { transitionDuration: '0.3s' },
  steppanel: {
    background: 'transparent',
    padding: '0',
    indent: '0',
  },
  stepHeader: {
    padding: '1.125rem 0.125rem',
    gap: '0.875rem',
    borderRadius: '0',
    // Inside the tab, so it doesn't draw a second box around the copper underline.
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '-2px',
      shadow: 'none',
    },
  },
  stepTitle: {
    color: '{surface.200}',
    activeColor: '{text.color}',
    fontWeight: '700',
    fontSize: '1rem',
  },
  stepNumber: {
    size: '2rem',
    fontSize: '0.875rem',
    fontWeight: '800',
    background: 'transparent',
    activeBackground: '{primary.color}',
    borderColor: 'color-mix(in srgb, {text.color} 15%, transparent)',
    activeBorderColor: '{primary.color}',
    color: '{text.muted.color}',
    activeColor: '{primary.contrast.color}',
  },
  // Flex items, so without the first rule a panel can't shrink below its content, and the booking calendar overflows
  // phones. Panels aren't indented under their number and have no connecting line: phones need the width, and from
  // lg the booking page lays the steps out in a row.
  css: `
    .p-steppanel > .p-motion,
    .p-steppanel-content-wrapper,
    .p-steppanel-content { min-width: 0; }
    .p-stepitem .p-steppanel-content { margin-inline-start: 0; }
    .p-stepitem:last-of-type .p-steppanel { padding-inline-start: 0; }
    .p-steppanel .p-stepper-separator { display: none; }

    .p-step { align-items: stretch; }
    .p-step-header { width: 100%; text-align: start; }
    .p-step-title { display: flex; flex-direction: column; align-items: flex-start; gap: 0.125rem; }

    /* A step with its pick (the booking page adds is-done) shows a check where its number was */
    .p-step.is-done .p-step-number {
      position: relative;
      border-color: transparent;
      background: color-mix(in srgb, var(--p-primary-color) 15%, transparent);
      color: transparent;
    }
    .p-step.is-done .p-step-number::after {
      content: '\\e94f';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: primeicons;
      font-size: 0.875rem;
      color: var(--p-primary-color);
    }

    @media (min-width: 64rem) {
      .p-step-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        padding: 0 0.75rem 1rem 0;
      }
      .p-step-title { gap: 0.25rem; }
      .p-step-number {
        width: auto;
        min-width: 0;
        height: auto;
        min-height: 0;
        border: 0;
        border-radius: 0;
        background: none;
        font-size: 0.75rem;
        letter-spacing: 0.14em;
      }
      .p-step-number::before { content: '0'; }
      .p-step-active .p-step-number,
      .p-step.is-done .p-step-number {
        background: none;
        color: var(--p-primary-color);
      }
      .p-step.is-done .p-step-number::after {
        position: static;
        display: inline;
        margin-inline-start: 0.4em;
        font-size: inherit;
      }
      .p-step-header {
        margin-bottom: -1px;
        border-bottom: 3px solid transparent;
        transition: border-color 0.3s ease;
      }
      .p-step-number { transition: color 0.3s ease; }
      .p-step-active .p-step-header { border-bottom-color: var(--p-primary-color); }

      /* PrimeNG's own 0.2s height change, slower and with a fade, so the step that closes eases out as the next opens.
         Every animation here runs as long as the height one: PrimeNG finishes at the first animationend. */
      .p-steppanel .p-collapsible-enter-active {
        animation: p-animate-collapsible-expand 0.45s var(--p-brand-ease), p-brand-step-in 0.45s ease;
      }
      .p-steppanel .p-collapsible-leave-active {
        animation: p-animate-collapsible-collapse 0.45s var(--p-brand-ease), p-brand-step-out 0.45s ease forwards;
      }
    }
    @keyframes p-brand-step-in { from { opacity: 0; } }
    @keyframes p-brand-step-out { to { opacity: 0; } }
    @media (min-width: 64rem) and (prefers-reduced-motion: reduce) {
      .p-steppanel .p-collapsible-enter-active,
      .p-steppanel .p-collapsible-leave-active { animation-duration: 0.01ms; }
    }
  `,
};
