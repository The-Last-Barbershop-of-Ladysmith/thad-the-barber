import { FormControl, FormGroup } from '@angular/forms';

export type BookingForm = FormGroup<{
  name: FormControl<string>;
  phone: FormControl<string>;
  date: FormControl<string | null>;
  startAt: FormControl<string | null>;
}>;
