import { FormControl, FormGroup } from '@angular/forms';

/** The booking page owns it; each step binds the controls it shows. */
export type BookingForm = FormGroup<{
  name: FormControl<string>;
  phone: FormControl<string>;
  date: FormControl<string | null>;
  startAt: FormControl<string | null>;
}>;
