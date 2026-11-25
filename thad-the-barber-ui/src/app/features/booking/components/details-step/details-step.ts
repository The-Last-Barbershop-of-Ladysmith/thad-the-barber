import { ChangeDetectionStrategy, Component, InputSignal, Signal, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { FieldError } from '../../../../shared/components/field-error/field-error';
import { PhoneField } from '../../../../shared/components/phone-field/phone-field';
import { toIsErrorShown } from '../../../../shared/utils/form-error.utils';

@Component({
  selector: 'app-details-step',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    FieldError,
    PhoneField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './details-step.html',
})
export class DetailsStep {
  readonly nameControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();
  readonly phoneControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();

  protected readonly isNameErrorShown: Signal<boolean> = toIsErrorShown(this.nameControl);
}
