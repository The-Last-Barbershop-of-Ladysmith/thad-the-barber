import {
  ChangeDetectionStrategy,
  Component,
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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { StepPassThrough, StepperPassThrough } from 'primeng/types/stepper';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SpinnerIcon } from 'primeng/icons/spinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { StepperModule } from 'primeng/stepper';
import { distinctUntilChanged, map } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { TitledPage } from '../../shared/components/titled-page/titled-page';
import { NoticeMessage } from '../../shared/components/notice-message/notice-message';
import { Notice } from '../../shared/models/notice.model';
import { RequestStatus } from '../../shared/models/request.models';
import { formatLongDate, fromIsoDate, toIsoDateIn } from '../../shared/utils/date.utils';
import { toE164 } from '../../shared/utils/phone.utils';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import { DateStep } from './components/date-step/date-step';
import { AppointmentSummary } from './components/appointment-summary/appointment-summary';
import { DetailsStep } from './components/details-step/details-step';
import { TimeStep } from './components/time-step/time-step';
import { AvailableDay } from './dtos/available-day.dto';
import { BookingForm } from './models/booking-form.model';
import { BookingPickState } from './models/booking-pick-state.model';
import { BookingStep } from './models/booking-step.model';
import { LeaveConfirmable } from './models/leave-confirmable.model';
import { ManagePageState } from './models/manage-page-state.model';
import { ReschedulePageState } from './models/reschedule-page-state.model';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { BookingState } from './state/booking.state';
import { BOOKING_NOT_FOUND_NOTICE, BOT_CHECK_FAILED_NOTICE } from './config/booking-notices';
import { toLongDateTime, toTimeLabel } from './utils/booking-time.utils';
import { toManagePath } from './utils/manage-link.utils';

interface BookingFormValue {
  name: string;
  phone: string;
  /** The picked day on the shop's calendar ("2026-10-27"). */
  date: string | null;
  /** One of the picked day's UTC start times. */
  startAt: string | null;
}

@Component({
  selector: 'app-booking',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    ProgressBarModule,
    SpinnerIcon,
    StepperModule,
    TitledPage,
    NoticeMessage,
    DateStep,
    TimeStep,
    AppointmentSummary,
    DetailsStep,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking implements LeaveConfirmable {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly injector: Injector = inject(Injector);

  // Moving a booking: read from the path, not an input, since input binding would also turn `/book?id=…` into a move.
  private readonly bookingId: Signal<string | null> = toSignal(
    this.route.paramMap.pipe(map((paramMap: ParamMap): string | null => paramMap.get('id'))),
    { requireSync: true },
  );
  readonly isRescheduling: Signal<boolean> = computed((): boolean => this.bookingId() !== null);
  private readonly reschedulePageState: WritableSignal<ReschedulePageState> = signal({});
  protected readonly manageToken: Signal<string | null> = computed((): string | null =>
    this.reschedulePageState().manageToken ?? null);
  protected readonly currentTimeLabel: Signal<string | null> = computed((): string | null => {
    const { startAt }: ReschedulePageState = this.reschedulePageState();
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toLongDateTime(timeZone, startAt) : null;
  });

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  readonly isSubmitting: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsSubmitting);
  private readonly isSubmitDone: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsSubmitDone);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;

  protected readonly botCheckFailedNotice: Notice = BOT_CHECK_FAILED_NOTICE;
  protected readonly bookingNotFoundNotice: Notice = BOOKING_NOT_FOUND_NOTICE;
  protected readonly submitNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectSubmitNotice);
  protected readonly squareBookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);

  protected readonly bookingForm: BookingForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S.*\S/)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)],
    }),
    date: new FormControl<string | null>(null, [Validators.required]),
    startAt: new FormControl<string | null>(null, [Validators.required]),
  });
  protected readonly bookingFormValue: Signal<BookingFormValue> = toSignal(
    this.bookingForm.valueChanges.pipe(map((): BookingFormValue => this.bookingForm.getRawValue())),
    { initialValue: this.bookingForm.getRawValue() },
  );
  // Kept while the same booking is retried, so one whose response was lost isn't made twice.
  private idempotencyKey: string | null = null;

  protected readonly bookingStep: typeof BookingStep = BookingStep;
  // PrimeNG makes the stepper a tablist, which ARIA allows only around a row of tabs. Each step here opens its panel
  // below its header, as an accordion does, so the stepper has no role and its headers are buttons.
  protected readonly stepperPt: StepperPassThrough = { root: { role: 'presentation' } };
  protected readonly stepPt: StepPassThrough = { header: { role: 'button' } };
  protected readonly openStep: WritableSignal<BookingStep> = signal(BookingStep.Day);

  protected readonly pickedDayLabel: Signal<string | null> = computed((): string | null => {
    const { date }: BookingFormValue = this.bookingFormValue();
    return date ? formatLongDate(fromIsoDate(date)) : null;
  });

  protected readonly pickedTimeLabel: Signal<string | null> = computed((): string | null => {
    const { startAt }: BookingFormValue = this.bookingFormValue();
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toTimeLabel(timeZone, startAt) : null;
  });

  protected readonly isDayDone: Signal<boolean> = computed(
    (): boolean => this.pickedDayLabel() !== null && this.openStep() !== BookingStep.Day,
  );

  protected readonly isTimeDone: Signal<boolean> = computed(
    (): boolean => this.pickedTimeLabel() !== null && this.openStep() !== BookingStep.Time,
  );

  protected readonly canConfirm: Signal<boolean> = computed((): boolean => {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    // `invalid`, not `valid`: the form is disabled while sending, and disabled controls are never valid.
    const areDetailsValid: boolean = this.isRescheduling()
      || (!this.bookingForm.controls.name.invalid && !this.bookingForm.controls.phone.invalid);
    const canSend: boolean = !this.isSubmitting() && !this.isSubmitDone() && !this.isBotCheckFailed();
    return date !== null && startAt !== null && areDetailsValid && canSend;
  });

  protected readonly confirmLabel: Signal<string> = computed((): string => {
    const { startAt }: BookingFormValue = this.bookingFormValue();
    const timeZone: string | null = this.timeZone();
    const pickedTime: string | null = startAt && timeZone ? toLongDateTime(timeZone, startAt) : null;
    if (this.isRescheduling()) {
      return pickedTime ? `Move to ${pickedTime}` : 'Move appointment';
    }
    return pickedTime ? `Book ${pickedTime}` : 'Book appointment';
  });

  // Includes a booking still being sent: leaving drops its response, so it would be neither shown nor kept (#210).
  readonly hasUnconfirmedPick: Signal<boolean> = computed((): boolean =>
    this.bookingFormValue().date !== null && !this.isSubmitDone());

  constructor() {
    this.startOverForEachBooking();
    this.lockFormWhileSubmitting();
    this.askBeforeUnloadWhileUnconfirmed();
    this.clearPicksNoLongerOpen();
    this.bookingForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.idempotencyKey = null;
      });
    this.bookingForm.controls.date.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((date: string | null): void => {
        this.bookingForm.controls.startAt.reset();
        if (date) {
          this.showStep(BookingStep.Time);
        }
      });
    this.bookingForm.controls.startAt.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((startAt: string | null): void => {
        if (startAt) {
          this.showStep(BookingStep.Confirm);
        }
      });
  }

  protected confirm(): void {
    const {
      name,
      phone,
      startAt,
    }: BookingFormValue = this.bookingForm.getRawValue();
    const bookingId: string | null = this.bookingId();
    const manageToken: string | null = this.manageToken();
    if (!startAt || !this.canConfirm()) {
      return;
    }
    if (bookingId && manageToken) {
      this.store.dispatch(BookingActions.RescheduleRequest({
        bookingId,
        manageToken,
        startAt,
      }));
    } else if (!bookingId) {
      this.idempotencyKey ??= crypto.randomUUID();
      this.store.dispatch(BookingActions.BookingRequest({
        bookingRequest: {
          startAt,
          name: name.trim(),
          phone: toE164(phone),
          idempotencyKey: this.idempotencyKey,
        },
      }));
    }
  }

  protected returnToBooking(): void {
    const bookingId: string | null = this.bookingId();
    const manageToken: string | null = this.manageToken();
    if (!bookingId || !manageToken) {
      return;
    }
    const managePageState: ManagePageState = { manageToken };
    void this.router.navigateByUrl(toManagePath(bookingId), { state: managePageState });
  }

  // The router reuses this page when another booking's reschedule opens from here.
  private startOverForEachBooking(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        const navigationState: ReschedulePageState & BookingPickState =
          this.router.currentNavigation()?.extras.state ?? {};
        const pickedStartAt: string | null = this.isRescheduling() ? null : navigationState.pickedStartAt ?? null;
        this.reschedulePageState.set(navigationState);
        this.bookingForm.reset();
        this.openStep.set(BookingStep.Day);
        this.store.dispatch(BookingActions.BookingPageOpen({ pickedStartAt }));
        this.pickTime(pickedStartAt);
      });
  }

  // A time tapped on the home page. The days load after this, and a time no longer open is cleared like any other. The
  // page's first open runs before the form's own step changes are listening, so the step is shown here.
  private pickTime(startAt: string | null): void {
    const timeZone: string | null = this.timeZone();
    if (!startAt || !timeZone) {
      return;
    }
    this.bookingForm.controls.date.setValue(toIsoDateIn(timeZone, new Date(startAt)));
    this.bookingForm.controls.startAt.setValue(startAt);
    this.showStep(BookingStep.Confirm);
  }

  // Without events, so locking and unlocking doesn't count as the customer changing the booking.
  private lockFormWhileSubmitting(): void {
    effect((): void => {
      if (this.isSubmitting()) {
        this.bookingForm.disable({ emitEvent: false });
      } else {
        this.bookingForm.enable({ emitEvent: false });
      }
    });
  }

  // A taken time comes off the open times; the pick goes with it. Only a loaded month holding the picked day can say
  // it's gone, so paging to another month keeps the pick.
  private clearPicksNoLongerOpen(): void {
    this.store
      .select(bookingFeature.selectBookingState)
      .pipe(takeUntilDestroyed())
      .subscribe(({
        loadStatus,
        dayRange,
        availableDays,
      }: BookingState): void => {
        const { date, startAt }: BookingFormValue = this.bookingForm.getRawValue();
        const isPickInView: boolean = date !== null && dayRange !== null
          && date >= dayRange.firstDay && date <= dayRange.lastDay;
        if (loadStatus !== RequestStatus.Success || !isPickInView) {
          return;
        }
        const pickedDay: AvailableDay | undefined = availableDays
          .find((availableDay: AvailableDay): boolean => availableDay.date === date);
        if (date && !pickedDay) {
          this.bookingForm.controls.date.reset();
          this.showStep(BookingStep.Day);
        } else if (startAt && !pickedDay?.times.includes(startAt)) {
          this.bookingForm.controls.startAt.reset();
          this.showStep(BookingStep.Time);
        }
      });
  }

  // The browser asks before closing or reloading the tab. Only while there's a pick: an always-on listener keeps the
  // page out of the back/forward cache.
  private askBeforeUnloadWhileUnconfirmed(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const onBeforeUnload: (event: BeforeUnloadEvent) => void = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    effect((onCleanup: (cleanup: () => void) => void): void => {
      if (!this.hasUnconfirmedPick()) {
        return;
      }
      window.addEventListener('beforeunload', onBeforeUnload);
      onCleanup((): void => {
        window.removeEventListener('beforeunload', onBeforeUnload);
      });
    });
  }

  // Focus follows the step that opens, since the one it was in collapses.
  private showStep(step: BookingStep): void {
    if (this.openStep() === step) {
      return;
    }
    this.openStep.set(step);
    afterNextRender(
      (): void => {
        document.querySelector<HTMLElement>('.p-step-active .p-step-header')?.focus();
      },
      { injector: this.injector },
    );
  }
}
