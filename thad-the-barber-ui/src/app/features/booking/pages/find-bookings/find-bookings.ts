import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  Signal,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { map } from 'rxjs';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { TitledPage } from '../../../../shared/components/titled-page/titled-page';
import { Notice } from '../../../../shared/models/notice.model';
import { toE164 } from '../../../../shared/utils/phone.utils';
import { LOOKUP_CODE_VALIDATORS, PHONE_VALIDATORS } from '../../../../shared/validators/form.validators';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { PhoneField } from '../../components/phone-field/phone-field';
import { NO_UPCOMING_BOOKINGS_NOTICE } from '../../config/booking-notices';
import { FoundBooking } from '../../dtos/found-booking.dto';
import { LookupStep } from '../../models/lookup-step.model';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { toLongDate, toTimeLabel } from '../../utils/booking-time.utils';
import { LOOKUP_CODE_MAX_LENGTH, toLookupCode } from '../../utils/lookup-code.utils';
import { toManageCommands, toManageFragment } from '../../utils/manage-link.utils';

interface FoundBookingLink {
  id: string;
  day: string;
  time: string;
  commands: string[];
  fragment: string;
}

interface LookupFormValue {
  phone: string;
  code: string;
}

type LookupForm = FormGroup<{
  phone: FormControl<string>;
  code: FormControl<string>;
}>;

@Component({
  selector: 'app-find-bookings',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    TitledPage,
    NoticeMessage,
    PhoneField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './find-bookings.html',
  styleUrl: './find-bookings.scss',
})
export class FindBookings {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly injector: Injector = inject(Injector);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly foundBookings: Signal<FoundBooking[]> = this.store.selectSignal(bookingFeature.selectFoundBookings);
  protected readonly step: Signal<LookupStep> = this.store.selectSignal(bookingFeature.selectLookupStep);
  protected readonly isLookingUp: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsLookingUp);
  protected readonly lookupNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectLookupNotice);

  protected readonly lookupStep: typeof LookupStep = LookupStep;
  protected readonly codeMaxLength: number = LOOKUP_CODE_MAX_LENGTH;
  protected readonly noUpcomingBookingsNotice: Notice = NO_UPCOMING_BOOKINGS_NOTICE;

  protected readonly lookupForm: LookupForm = new FormGroup({
    phone: new FormControl('', {
      nonNullable: true,
      validators: PHONE_VALIDATORS,
    }),
    code: new FormControl('', {
      nonNullable: true,
      validators: LOOKUP_CODE_VALIDATORS,
    }),
  });
  protected readonly lookupFormValue: Signal<LookupFormValue> = toSignal(
    this.lookupForm.valueChanges.pipe(map((): LookupFormValue => this.lookupForm.getRawValue())),
    { initialValue: this.lookupForm.getRawValue() },
  );

  // `invalid`, not `valid`: the form is disabled while looking up, and disabled controls are never valid. Reading the
  // form's value makes the check run again as the customer types, since validity itself isn't a signal.
  protected readonly canSendCode: Signal<boolean> = computed((): boolean => {
    this.lookupFormValue();
    return !this.lookupForm.controls.phone.invalid && !this.isLookingUp();
  });

  protected readonly canVerifyCode: Signal<boolean> = computed((): boolean => {
    this.lookupFormValue();
    return !this.lookupForm.controls.code.invalid && !this.isLookingUp();
  });

  protected readonly isShopLoading: Signal<boolean> = computed((): boolean => this.timeZone() === null);

  protected readonly foundBookingLinks: Signal<FoundBookingLink[]> = computed((): FoundBookingLink[] => {
    const timeZone: string | null = this.timeZone();
    if (!timeZone) {
      return [];
    }
    return this.foundBookings().map((foundBooking: FoundBooking): FoundBookingLink => ({
      id: foundBooking.id,
      day: toLongDate(timeZone, foundBooking.startAt),
      time: toTimeLabel(timeZone, foundBooking.startAt),
      commands: toManageCommands(foundBooking.id),
      fragment: toManageFragment(foundBooking.manageToken),
    }));
  });

  constructor() {
    this.store.dispatch(BookingActions.LookupReset());
    inject(DestroyRef).onDestroy((): void => {
      this.store.dispatch(BookingActions.LookupReset());
    });
    this.keepOnlyDigitsInCode();
    this.lockFormWhileLookingUp();
    this.focusFirstFieldOfStep();
  }

  protected submitStep(): void {
    if (this.step() === LookupStep.Phone) {
      this.sendCode();
    } else {
      this.verifyCode();
    }
  }

  protected sendCode(): void {
    if (this.canSendCode()) {
      this.store.dispatch(BookingActions.LookupStartRequest({ phone: toE164(this.lookupForm.controls.phone.value) }));
    }
  }

  protected resendCode(): void {
    this.lookupForm.controls.code.reset();
    this.sendCode();
  }

  protected verifyCode(): void {
    if (this.canVerifyCode()) {
      this.store.dispatch(BookingActions.LookupVerifyRequest({
        phone: toE164(this.lookupForm.controls.phone.value),
        code: this.lookupForm.controls.code.value,
      }));
    }
  }

  protected changePhone(): void {
    this.lookupForm.controls.code.reset();
    this.store.dispatch(BookingActions.LookupPhoneChange());
  }

  private keepOnlyDigitsInCode(): void {
    const codeControl: FormControl<string> = this.lookupForm.controls.code;
    codeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((typed: string): void => {
      const digits: string = toLookupCode(typed);
      if (digits !== typed) {
        codeControl.setValue(digits);
      }
    });
  }

  // Without events, so locking and unlocking doesn't count as the customer typing.
  private lockFormWhileLookingUp(): void {
    effect((): void => {
      if (this.isLookingUp()) {
        this.lookupForm.disable({ emitEvent: false });
      } else {
        this.lookupForm.enable({ emitEvent: false });
      }
    });
  }

  private focusFirstFieldOfStep(): void {
    const focusTargets: Record<LookupStep, string> = {
      [LookupStep.Phone]: 'lookup-phone',
      [LookupStep.Code]: 'lookup-code',
      [LookupStep.Results]: 'lookup-results-heading',
    };
    effect((): void => {
      const focusTarget: string = focusTargets[this.step()];
      afterNextRender(
        (): void => {
          document.getElementById(focusTarget)?.focus();
        },
        { injector: this.injector },
      );
    });
  }
}
