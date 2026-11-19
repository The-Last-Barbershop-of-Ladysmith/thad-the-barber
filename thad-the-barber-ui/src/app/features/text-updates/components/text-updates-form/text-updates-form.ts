import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InputSignal,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { SpinnerIcon } from 'primeng/icons/spinner';
import { IS_COMING_SOON } from '../../../../core/config/coming-soon.token';
import { FieldError } from '../../../../shared/components/field-error/field-error';
import { PhoneField } from '../../../../shared/components/phone-field/phone-field';
import { RequestStatus } from '../../../../shared/models/request.models';
import { toIsErrorShown } from '../../../../shared/utils/form-error.utils';
import { toE164 } from '../../../../shared/utils/phone.utils';
import { PHONE_VALIDATORS } from '../../../../shared/validators/form.validators';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { SmsSignupService } from '../../services/sms-signup.service';

type TextUpdatesFormGroup = FormGroup<{
  phone: FormControl<string>;
  hasConsent: FormControl<boolean>;
}>;

/**
 * The sign-up for the shop's news texts: a phone and its own consent, separate from the booking texts. It owns its
 * one-visit state, so the dialog and the `/text-updates` page both just place it. `idPrefix` keeps ids unique if two
 * are ever on one page.
 */
@Component({
  selector: 'app-text-updates-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    SpinnerIcon,
    FieldError,
    PhoneField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-updates-form.html',
})
export class TextUpdatesForm {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly signups: SmsSignupService = inject(SmsSignupService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly idPrefix: InputSignal<string> = input<string>('text-updates');

  protected readonly isComingSoon: boolean = inject(IS_COMING_SOON);

  protected readonly requestStatus: typeof RequestStatus = RequestStatus;
  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly status: WritableSignal<RequestStatus> = signal(RequestStatus.Idle);
  protected readonly isSubmitting: Signal<boolean> = computed((): boolean => this.status() === RequestStatus.Pending);
  protected readonly signupForm: TextUpdatesFormGroup = new FormGroup({
    phone: new FormControl('', {
      nonNullable: true,
      validators: PHONE_VALIDATORS,
    }),
    hasConsent: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
  });
  protected readonly isConsentErrorShown: Signal<boolean> = toIsErrorShown(
    signal(this.signupForm.controls.hasConsent),
  );
  protected readonly consentId: Signal<string> = computed((): string => `${this.idPrefix()}-consent`);
  protected readonly phoneId: Signal<string> = computed((): string => `${this.idPrefix()}-phone`);

  constructor() {
    if (this.isComingSoon) {
      this.signupForm.disable();
    }
  }

  protected submit(): void {
    this.signupForm.markAllAsTouched();
    if (this.isComingSoon || this.signupForm.invalid || this.isSubmitting()) {
      return;
    }
    this.status.set(RequestStatus.Pending);
    this.signupForm.disable();
    this.signups.subscribe(toE164(this.signupForm.controls.phone.value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (): void => {
          this.status.set(RequestStatus.Success);
        },
        error: (): void => {
          this.status.set(RequestStatus.Error);
          this.signupForm.enable();
        },
      });
  }
}
