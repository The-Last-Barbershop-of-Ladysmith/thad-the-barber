import { ChangeDetectionStrategy, Component, InputSignal, Signal, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputMaskModule } from 'primeng/inputmask';
import { InputMaskPassThrough } from 'primeng/types/inputmask';
import { toIsErrorShown } from '../../utils/form-error.utils';
import { PHONE_MASK } from '../../validators/form.validators';
import { FieldError } from '../field-error/field-error';

@Component({
  selector: 'app-phone-field',
  imports: [
    ReactiveFormsModule,
    InputMaskModule,
    FieldError,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './phone-field.html',
})
export class PhoneField {
  protected readonly phoneMask: string = PHONE_MASK;

  readonly inputId: InputSignal<string> = input.required<string>();
  readonly isRequiredMarked: InputSignal<boolean> = input<boolean>(false);
  readonly isLabelHidden: InputSignal<boolean> = input<boolean>(false);
  readonly phoneControl: InputSignal<FormControl<string>> = input.required<FormControl<string>>();

  protected readonly isErrorShown: Signal<boolean> = toIsErrorShown(this.phoneControl);
  protected readonly hintId: Signal<string> = computed((): string => `${this.inputId()}-hint`);
  protected readonly errorId: Signal<string> = computed((): string => `${this.inputId()}-error`);

  // InputMask has no inputs for these, so they reach its inner input through pass-through.
  protected readonly inputPassThrough: Signal<InputMaskPassThrough> = computed((): InputMaskPassThrough => ({
    pcInputText: {
      root: {
        inputmode: 'tel',
        'aria-describedby': this.isErrorShown() ? `${this.hintId()} ${this.errorId()}` : this.hintId(),
        'aria-invalid': this.isErrorShown() ? 'true' : null,
      },
    },
  }));

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
