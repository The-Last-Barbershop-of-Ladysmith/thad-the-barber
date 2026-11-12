import { ButtonStyle, ButtonVariant } from '../models/button.models';

export const BUTTON_STYLES: Readonly<Record<ButtonVariant, ButtonStyle>> = {
  [ButtonVariant.Primary]: { severity: 'primary', variant: undefined },
  [ButtonVariant.Secondary]: { severity: 'secondary', variant: undefined },
  [ButtonVariant.Outlined]: { severity: 'primary', variant: 'outlined' },
  [ButtonVariant.Text]: { severity: 'primary', variant: 'text' },
};
