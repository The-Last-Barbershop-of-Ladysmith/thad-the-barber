import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { PHONE_VALIDATORS } from '../../../../shared/validators/form.validators';
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

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    it(
      'links to the privacy policy in a new tab, so the booking in progress stays open',
      (): void => {
        const privacyLink: HTMLAnchorElement | null = render('').closest('section')
          ?.querySelector<HTMLAnchorElement>('[data-testid="details-privacy"]') ?? null;

        expect(privacyLink?.getAttribute('href')).toBe('/privacy');
        expect(privacyLink?.target).toBe('_blank');
      },
    );

    describe(
      'accessibility',
      (): void => {
        let fixture: ComponentFixture<DetailsStep>;
        let nameControl: FormControl<string>;

        function field(selector: string): HTMLInputElement | null {
          return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selector);
        }

        beforeEach((): void => {
          nameControl = new FormControl<string>('', {
            nonNullable: true,
            validators: Validators.required,
          });
          fixture = TestBed.createComponent(DetailsStep);
          fixture.componentRef.setInput('nameControl', nameControl);
          fixture.componentRef.setInput('phoneControl', new FormControl<string>('', {
            nonNullable: true,
            validators: PHONE_VALIDATORS,
          }));
          fixture.detectChanges();
        });

        it(
          'marks name and phone as required with a hidden asterisk and aria-required, and explains the asterisk',
          (): void => {
            const host: HTMLElement = fixture.nativeElement as HTMLElement;

            expect(host.querySelectorAll('label .required-mark[aria-hidden="true"]')).toHaveLength(2);
            expect(field('#booking-name')?.getAttribute('aria-required')).toBe('true');
            expect(field('#booking-phone')?.getAttribute('aria-required')).toBe('true');
            expect(host.querySelector('[data-testid="details-required-note"]')?.textContent).toContain('marks a required field');
          },
        );

        it(
          'names the purpose of the name and phone fields for autofill (1.3.5)',
          (): void => {
            expect(field('#booking-name')?.getAttribute('autocomplete')).toBe('name');
            expect(field('#booking-phone')?.getAttribute('autocomplete')).toBe('tel');
          },
        );

        it(
          'says nothing about an empty name until the field has been left',
          (): void => {
            expect(field('#booking-name-error')).toBeNull();
            expect(field('#booking-name')?.hasAttribute('aria-invalid')).toBe(false);
          },
        );

        it(
          'links the name error to the name field and flags it invalid once the field has been left',
          async (): Promise<void> => {
            nameControl.markAsTouched();
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(field('#booking-name-error')?.getAttribute('role')).toBe('alert');
            expect(field('#booking-name')?.getAttribute('aria-describedby')).toBe('booking-name-error');
            expect(field('#booking-name')?.getAttribute('aria-invalid')).toBe('true');
          },
        );
      },
    );
  },
);
