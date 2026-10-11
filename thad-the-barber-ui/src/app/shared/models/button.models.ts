import { ButtonSeverity, ButtonVariant as PrimeButtonVariant } from 'primeng/types/button';

/** The button looks content can ask for; `BUTTON_STYLES` maps each to PrimeNG's inputs. */
export enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Outlined = 'outlined',
  Text = 'text',
}

/** The `pButton` inputs for one `ButtonVariant`. */
export interface ButtonStyle {
  severity: ButtonSeverity;
  variant: PrimeButtonVariant | undefined;
}
