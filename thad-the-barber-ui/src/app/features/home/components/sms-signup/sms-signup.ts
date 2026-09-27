import { ChangeDetectionStrategy, Component, type Signal, inject } from '@angular/core';
import { type AppState } from '../../../../store/app.state';
import { type SmsSignupState } from '../../state/home.state';
import { phoneValidators } from '../../../../shared/validators/form.validators';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageModule } from 'primeng/message';
import { HomePageActions } from '../../state/home.actions';
import { homeFeature } from '../../state/home.feature';

/** Phone number opt-in for text alerts, shown inside the first announcement. */
@Component({
  selector: 'app-sms-signup',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputMaskModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sms-signup.html',
  styleUrl: './sms-signup.scss',
})
export class SmsSignup {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly signup: Signal<SmsSignupState> = this.store.selectSignal(homeFeature.selectSmsSignup);
  protected readonly submitting: Signal<boolean> = this.store.selectSignal(homeFeature.selectIsSubscribing);
  protected readonly phone: FormControl<string> = new FormControl(
    '',
    {
      nonNullable: true,
      validators: phoneValidators,
    },
  );

  protected submit(): void {
    this.phone.markAsTouched();
    if (this.phone.invalid) {
      return;
    }
    this.store.dispatch(HomePageActions.smsSignupSubmitted({ phone: this.phone.value }));
  }
}
