import { ButtonVariant } from '../models/button.models';
import { BUTTON_STYLES, isButtonVariant } from './button.utils';

describe(
  'button utils',
  (): void => {
    it(
      'accepts only the enum values',
      (): void => {
        expect(isButtonVariant('outlined')).toBe(true);
        expect(isButtonVariant(ButtonVariant.Text)).toBe(true);
        expect(isButtonVariant('Outlined')).toBe(false);
        expect(isButtonVariant('glowing')).toBe(false);
        expect(isButtonVariant(undefined)).toBe(false);
      },
    );

    it(
      'maps every variant to PrimeNG inputs',
      (): void => {
        expect(BUTTON_STYLES[ButtonVariant.Primary]).toEqual({ severity: 'primary', variant: undefined });
        expect(BUTTON_STYLES[ButtonVariant.Secondary]).toEqual({ severity: 'secondary', variant: undefined });
        expect(BUTTON_STYLES[ButtonVariant.Outlined]).toEqual({ severity: 'primary', variant: 'outlined' });
        expect(BUTTON_STYLES[ButtonVariant.Text]).toEqual({ severity: 'primary', variant: 'text' });
      },
    );
  },
);
