import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';

/** Step 3: customer name and mobile number. */
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
  readonly nameControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();
  readonly phoneControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();
}
