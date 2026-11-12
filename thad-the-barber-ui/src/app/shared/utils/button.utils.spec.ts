import { ButtonVariant } from '../models/button.models';
import { BUTTON_STYLES } from './button.utils';

describe(
  'button utils',
  (): void => {
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
