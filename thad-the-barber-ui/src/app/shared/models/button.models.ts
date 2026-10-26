import { ButtonSeverity, ButtonVariant as PrimeButtonVariant } from 'primeng/types/button';
import { LinkKind } from './link.models';

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

export interface Button {
  label: string;
  url: string;
  kind: LinkKind;
  variant: ButtonVariant;
}
