import { StepperDesignTokens } from '@primeuix/themes/types/stepper';

/** Panels and step numbers sit on the card's glass, not their own surface. */
export const stepper: StepperDesignTokens = {
  steppanel: { background: 'transparent' },
  stepNumber: {
    background: 'transparent',
    activeBackground: 'transparent',
  },
};
