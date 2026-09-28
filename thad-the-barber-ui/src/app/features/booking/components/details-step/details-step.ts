import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { type FormControl, type FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';

export type BookingDetailsForm = FormGroup<{
  name: FormControl<string>;
  phone: FormControl<string>;
}>;

/** Step 3: customer name and mobile number. The form group is owned by the booking page. */
@Component({
  selector: 'app-details-step',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    InputMaskModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './details-step.html',
})
export class DetailsStep {
  readonly form: InputSignal<BookingDetailsForm> = input.required<BookingDetailsForm>();
}
