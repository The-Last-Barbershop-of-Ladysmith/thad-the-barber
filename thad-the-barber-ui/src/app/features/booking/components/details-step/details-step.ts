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
