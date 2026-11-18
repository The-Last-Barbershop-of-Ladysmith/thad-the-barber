import { Directive } from '@angular/core';
import { ControlContainer } from '@angular/forms';

/**
 * Keeps the form around an element from seeing the controls inside it. PrimeNG's SelectButton draws a toggle button
 * per option with an `[ngModel]` of its own; inside a `[formGroup]` Angular warns (NG01354) that each one cannot join
 * that form. They are not meant to, so this says there is no form for them: the SelectButton itself is still bound by
 * its own `[formControl]`.
 */
@Directive({
  selector: '[appNoParentForm]',
  providers: [
    {
      provide: ControlContainer,
      useValue: null,
    },
  ],
})
export class NoParentForm {}
