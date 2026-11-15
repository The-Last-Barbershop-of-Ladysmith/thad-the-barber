import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { PhoneField } from './phone-field';

describe(
  'PhoneField',
  (): void => {
    function render(phone: string): HTMLInputElement {
      const fixture: ComponentFixture<PhoneField> = TestBed.createComponent(PhoneField);
      fixture.componentRef.setInput('inputId', 'made-up-phone');
      fixture.componentRef.setInput('phoneControl', new FormControl<string>(phone, { nonNullable: true }));
      fixture.detectChanges();
      const phoneInput: HTMLInputElement | null = (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>('#made-up-phone');
      if (!phoneInput) {
        throw new Error('No phone input');
      }
      return phoneInput;
    }

    it(
      'labels the input it is given the ID of',
      (): void => {
        const label: HTMLLabelElement | null = render('').closest('div')?.querySelector('label') ?? null;

        expect(label?.htmlFor).toBe('made-up-phone');
      },
    );

    it(
      'puts the caret on the first digit slot when an empty phone field is clicked anywhere in the mask',
      (): void => {
        const phoneInput: HTMLInputElement = render('');
        phoneInput.value = '(___) ___-____';
        phoneInput.setSelectionRange(9, 9);

        phoneInput.click();

        expect(phoneInput.selectionStart).toBe(1);
      },
    );

    it(
      'leaves the caret where it was clicked once a digit is typed',
      (): void => {
        const phoneInput: HTMLInputElement = render('(540) ___-____');
        phoneInput.value = '(540) ___-____';
        phoneInput.setSelectionRange(9, 9);

        phoneInput.click();

        expect(phoneInput.selectionStart).toBe(9);
      },
    );
  },
);
