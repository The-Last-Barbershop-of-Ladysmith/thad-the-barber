import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

/** Matches the display format produced by the `(999) 999-9999` input mask. */
export const PHONE_PATTERN: RegExp = /^\(\d{3}\) \d{3}-\d{4}$/;

/** `Validators.required` wrapped so it isn't passed around as an unbound static method. */
export function requiredValidator(control: AbstractControl): ValidationErrors | null {
  return Validators.required(control);
}

/** Required, and a complete 10-digit US number from the input mask. */
export const phoneValidators: ValidatorFn[] = [requiredValidator, Validators.pattern(PHONE_PATTERN)];

/** Required, at least 2 characters. */
export const nameValidators: ValidatorFn[] = [requiredValidator, Validators.minLength(2)];
