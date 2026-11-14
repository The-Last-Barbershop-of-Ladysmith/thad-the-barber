import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PhoneField } from '../phone-field/phone-field';

@Component({
  selector: 'app-details-step',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PhoneField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './details-step.html',
})
export class DetailsStep {
  readonly nameControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();
  readonly phoneControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();
}
