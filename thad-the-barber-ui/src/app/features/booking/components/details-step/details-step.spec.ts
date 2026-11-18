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
      fixture.componentRef.setInput('consentControl', new FormControl<boolean>(false, { nonNullable: true }));
      fixture.componentRef.setInput('marketingConsentControl', new FormControl<boolean>(false, { nonNullable: true }));
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

    it(
      'links to the terms in a new tab, so the booking in progress stays open',
      (): void => {
        const termsLink: HTMLAnchorElement | null = render('').closest('section')
          ?.querySelector<HTMLAnchorElement>('[data-testid="details-terms"]') ?? null;

        expect(termsLink?.getAttribute('href')).toBe('/terms');
        expect(termsLink?.target).toBe('_blank');
      },
    );

    describe(
      'accessibility',
      (): void => {
        let fixture: ComponentFixture<DetailsStep>;
        let nameControl: FormControl<string>;
        let consentControl: FormControl<boolean>;
        let marketingConsentControl: FormControl<boolean>;

        function field(selector: string): HTMLInputElement | null {
          return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selector);
        }

        beforeEach((): void => {
          nameControl = new FormControl<string>('', {
            nonNullable: true,
            validators: Validators.required,
          });
          marketingConsentControl = new FormControl<boolean>(false, { nonNullable: true });
          fixture = TestBed.createComponent(DetailsStep);
          fixture.componentRef.setInput('nameControl', nameControl);
          fixture.componentRef.setInput('phoneControl', new FormControl<string>('', {
            nonNullable: true,
            validators: PHONE_VALIDATORS,
          }));
          consentControl = new FormControl<boolean>(false, {
            nonNullable: true,
            validators: Validators.requiredTrue,
          });
          fixture.componentRef.setInput('consentControl', consentControl);
          fixture.componentRef.setInput('marketingConsentControl', marketingConsentControl);
          fixture.detectChanges();
        });

        it(
          'marks name, phone and the text-message box as required with a hidden asterisk, and explains the asterisk',
          (): void => {
            const host: HTMLElement = fixture.nativeElement as HTMLElement;

            expect(host.querySelectorAll('label .required-mark[aria-hidden="true"]')).toHaveLength(3);
            expect(field('#booking-name')?.getAttribute('aria-required')).toBe('true');
            expect(field('#booking-phone')?.getAttribute('aria-required')).toBe('true');
            expect(host.querySelector('[data-testid="details-required-note"]')?.textContent).toContain('marks a required field');
          },
        );

        it(
          'shows the text-message box unticked, with its rates and STOP wording in the label',
          (): void => {
            const box: HTMLInputElement | null = field('#booking-text-consent');
            const label: string = (fixture.nativeElement as HTMLElement)
              .querySelector('label[for="booking-text-consent"]')?.textContent ?? '';

            expect(box?.checked).toBe(false);
            expect(label).toContain('Text me to confirm this appointment');
            expect(label).toContain('Message and data rates may apply');
            expect(label).toContain('Reply STOP to opt out');
          },
        );

        it(
          'says nothing about the box until it has been left unticked, then asks for it and clears when ticked',
          async (): Promise<void> => {
            expect(field('#booking-text-consent-error')).toBeNull();

            consentControl.markAsTouched();
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(field('#booking-text-consent-error')?.getAttribute('role')).toBe('alert');

            consentControl.setValue(true);
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(field('#booking-text-consent-error')).toBeNull();
          },
        );

        it(
          'offers the shop news texts as an optional box, unticked, apart from the required booking texts',
          (): void => {
            const box: HTMLInputElement | null = field('#booking-marketing-consent');
            const label: string = (fixture.nativeElement as HTMLElement)
              .querySelector('label[for="booking-marketing-consent"]')?.textContent ?? '';

            expect(box?.checked).toBe(false);
            expect(box?.hasAttribute('required')).toBe(false);
            expect(label).toContain('optional');
            expect(label).toContain('Not needed to book');
            expect(label).toContain('Reply STOP to opt out');
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
