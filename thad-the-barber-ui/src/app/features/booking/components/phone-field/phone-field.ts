import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputMaskModule } from 'primeng/inputmask';
import { PHONE_MASK } from '../../../../shared/validators/form.validators';

@Component({
  selector: 'app-phone-field',
  imports: [
    ReactiveFormsModule,
    InputMaskModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './phone-field.html',
})
export class PhoneField {
  protected readonly phoneMask: string = PHONE_MASK;

  readonly inputId: InputSignal<string> = input.required<string>();
  readonly phoneControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();

  /**
   * InputMask puts the caret on the first empty digit when the field gets focus, but the click that focused it then
   * moves the caret to wherever it landed in the mask. While no digit is typed, the caret goes back to the first slot.
   */
  protected moveCaretToFirstDigit(event: MouseEvent): void {
    const isEmpty: boolean = !/\d/.test(this.phoneControl().value);
    if (!isEmpty || !(event.target instanceof HTMLInputElement)) {
      return;
    }
    const firstDigitSlot: number = Math.max(event.target.value.indexOf('_'), 0);
    event.target.setSelectionRange(firstDigitSlot, firstDigitSlot);
  }
}
