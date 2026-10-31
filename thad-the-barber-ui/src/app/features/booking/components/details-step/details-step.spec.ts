import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { DetailsStep } from './details-step';

describe(
  'DetailsStep',
  (): void => {
    function render(phone: string): HTMLInputElement {
      const fixture: ComponentFixture<DetailsStep> = TestBed.createComponent(DetailsStep);
      fixture.componentRef.setInput('nameControl', new FormControl<string>('', { nonNullable: true }));
      fixture.componentRef.setInput('phoneControl', new FormControl<string>(phone, { nonNullable: true }));
      fixture.detectChanges();
      const phoneInput: HTMLInputElement | null = (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLInputElement>('#booking-phone');
      if (!phoneInput) {
        throw new Error('No phone input');
      }
      return phoneInput;
    }

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
