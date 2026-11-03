import { StepperDesignTokens } from '@primeuix/themes/types/stepper';

/** Panels and step numbers sit on the card's glass, not their own surface. */
export const stepper: StepperDesignTokens = {
  steppanel: { background: 'transparent' },
  // Flex items, so without this a panel can't shrink below its content, and the booking calendar overflows phones.
  // Panels aren't indented under their number and have no connecting line: phones need the width, and from lg the
  // booking page lays the steps out in a row.
  css: `
    .p-steppanel > .p-motion,
    .p-steppanel-content-wrapper,
    .p-steppanel-content { min-width: 0; }
    .p-steppanel-content { margin-inline-start: 0; }
    .p-steppanel .p-stepper-separator { display: none; }
  `,
  stepNumber: {
    background: 'transparent',
    activeBackground: 'transparent',
  },
};
