import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { Observable, finalize, map } from 'rxjs';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { TitledPage } from '../../../../shared/components/titled-page/titled-page';
import { Notice } from '../../../../shared/models/notice.model';
import { toProblemNotice } from '../../../../shared/utils/problem.utils';
import { toE164 } from '../../../../shared/utils/phone.utils';
import { LOOKUP_CODE_VALIDATORS, PHONE_VALIDATORS } from '../../../../shared/validators/form.validators';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { PhoneField } from '../../components/phone-field/phone-field';
import {
  CODE_SENT_NOTICE,
  LOOKUP_FAILED_NOTICE,
  LOOKUP_PROBLEM_NOTICES,
  NO_UPCOMING_BOOKINGS_NOTICE,
} from '../../config/booking-notices';
import { FoundBooking } from '../../dtos/found-booking.dto';
import { VerifiedList } from '../../dtos/verified-list.dto';
import { LookupStep } from '../../models/lookup-step.model';
import { BookingService } from '../../services/booking.service';
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
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly injector: Injector = inject(Injector);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly foundBookings: WritableSignal<FoundBooking[]> = signal([]);
  protected readonly step: WritableSignal<LookupStep> = signal(LookupStep.Phone);
  protected readonly isLookingUp: WritableSignal<boolean> = signal(false);
  protected readonly lookupNotice: WritableSignal<Notice | null> = signal(null);

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
    const isPhoneValid: boolean = !this.lookupForm.controls.phone.invalid;
    return isPhoneValid && !this.isLookingUp();
  });

  protected readonly canVerifyCode: Signal<boolean> = computed((): boolean => {
    this.lookupFormValue();
    const isCodeValid: boolean = !this.lookupForm.controls.code.invalid;
    return isCodeValid && !this.isLookingUp();
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
    if (!this.canSendCode()) {
      return;
    }
    this.runLookup(
      this.bookingService.sendLookupCode({ phone: this.toPhone() }),
      (): void => {
        this.step.set(LookupStep.Code);
        this.lookupNotice.set(CODE_SENT_NOTICE);
      },
    );
  }

  protected resendCode(): void {
    this.lookupForm.controls.code.reset();
    this.sendCode();
  }

  protected verifyCode(): void {
    if (!this.canVerifyCode()) {
      return;
    }
    this.runLookup(
      this.bookingService.getVerifiedList({
        phone: this.toPhone(),
        code: this.lookupForm.controls.code.value,
      }),
      (verifiedList: VerifiedList): void => {
        this.foundBookings.set(verifiedList.bookings);
        this.step.set(LookupStep.Results);
      },
    );
  }

  protected changePhone(): void {
    this.lookupForm.controls.code.reset();
    this.lookupNotice.set(null);
    this.step.set(LookupStep.Phone);
  }

  // A request still sent when the page closes is dropped with it.
  private runLookup<T>(request: Observable<T>, onSuccess: (result: T) => void): void {
    this.isLookingUp.set(true);
    this.lookupNotice.set(null);
    request
      .pipe(
        finalize((): void => {
          this.isLookingUp.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: onSuccess,
        error: (error: unknown): void => {
          this.lookupNotice.set(toProblemNotice(
            error,
            LOOKUP_PROBLEM_NOTICES,
            LOOKUP_FAILED_NOTICE,
          ));
        },
      });
  }

  private toPhone(): string {
    return toE164(this.lookupForm.controls.phone.value);
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
    // Focus returns when a request ends, since locking the form drops it.
    effect((): void => {
      const focusTarget: string = focusTargets[this.step()];
      if (this.isLookingUp()) {
        return;
      }
      afterNextRender(
        (): void => {
          document.getElementById(focusTarget)?.focus();
        },
        { injector: this.injector },
      );
    });
  }
}
