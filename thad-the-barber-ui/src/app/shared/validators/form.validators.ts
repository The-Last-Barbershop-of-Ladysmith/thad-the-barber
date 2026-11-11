import { ValidatorFn, Validators } from '@angular/forms';

export const PHONE_MASK: string = '(999) 999-9999';

export const PHONE_VALIDATORS: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/),
];

export const NAME_VALIDATORS: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(/\S.*\S/),
];
