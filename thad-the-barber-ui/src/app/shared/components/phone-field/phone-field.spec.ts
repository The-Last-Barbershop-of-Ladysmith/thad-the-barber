import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { expectNoAxeViolations } from '../../../../testing/axe';
import { PHONE_VALIDATORS } from '../../validators/form.validators';
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

    it(
      'has no axe violations, empty or filled',
      async (): Promise<void> => {
        await expectNoAxeViolations(render('').closest('div') as HTMLElement);
        await expectNoAxeViolations(render('(540) 555-0100').closest('div') as HTMLElement);
      },
    );

    describe(
      'accessibility',
      (): void => {
        function renderWith(control: FormControl<string>): HTMLElement {
          const fixture: ComponentFixture<PhoneField> = TestBed.createComponent(PhoneField);
          fixture.componentRef.setInput('inputId', 'made-up-phone');
          fixture.componentRef.setInput('isRequiredMarked', true);
          fixture.componentRef.setInput('phoneControl', control);
          fixture.detectChanges();
          control.markAsTouched();
          fixture.detectChanges();
          return fixture.nativeElement as HTMLElement;
        }

        function phoneControl(): FormControl<string> {
          return new FormControl<string>('', {
            nonNullable: true,
            validators: PHONE_VALIDATORS,
          });
        }

        it(
          'is a telephone field with the phone keyboard, autofill purpose and a format hint the field points to',
          (): void => {
            const input: HTMLInputElement | null = renderWith(phoneControl()).querySelector('#made-up-phone');
            const hintId: string | null = input?.getAttribute('aria-describedby')?.split(' ')[0] ?? null;

            expect(input?.type).toBe('tel');
            expect(input?.getAttribute('inputmode')).toBe('tel');
            expect(input?.getAttribute('autocomplete')).toBe('tel');
            expect(input?.getAttribute('aria-required')).toBe('true');
            expect(hintId).toBe('made-up-phone-hint');
            expect(input?.ownerDocument.getElementById(hintId ?? '')).not.toBeNull();
          },
        );

        it(
          'links an error to the field and flags it invalid after the field was left empty',
          async (): Promise<void> => {
            const host: HTMLElement = renderWith(phoneControl());
            await Promise.resolve();
            const input: HTMLInputElement | null = host.querySelector('#made-up-phone');

            expect(input?.getAttribute('aria-invalid')).toBe('true');
            expect(input?.getAttribute('aria-describedby')).toContain('made-up-phone-error');
            expect(host.querySelector('#made-up-phone-error')?.getAttribute('role')).toBe('alert');
          },
        );
      },
    );
  },
);
