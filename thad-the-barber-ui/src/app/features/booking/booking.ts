import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { filter, finalize, map, take } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { formatFullDate, formatShortDate, fromIsoDate } from '../../shared/utils/date.utils';
import { toE164 } from '../../shared/utils/phone.utils';
import { getProblemCode } from '../../shared/utils/problem.utils';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import { DateStep } from './components/date-step/date-step';
import { DetailsStep } from './components/details-step/details-step';
import { NoticeMessage } from './components/notice-message/notice-message';
import { ReviewStep } from './components/review-step/review-step';
import { TimeStep } from './components/time-step/time-step';
import { BookingConfirmation } from './models/booking-confirmation.model';
import { BookingForm } from './models/booking-form.model';
import { BookingFormValue } from './models/booking-form-value.model';
import { BookingNotice } from './models/booking-notice.model';
import { BookingStep } from './models/booking-step.model';
import { StepView } from './models/step-view.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { BOT_CHECK_FAILED_NOTICE, toBookedNotice, toBookingNotice } from './utils/booking-notice.utils';
import {
  BOOKING_STEPS,
  StepProgress,
  canOpenStep,
  isStepDone,
  toNextStep,
  toPreviousStep,
} from './utils/booking-steps.utils';
import { toTimeLabel } from './utils/booking-time.utils';
import { toKeptBooking } from './utils/saved-confirmation.utils';

/** The step rail and one step at a time start here; below it, the steps collapse into cards (#207, #208). */
const DESKTOP_QUERY: string = '(min-width: 64rem)';

const STEP_TITLES: Record<BookingStep, string> = {
  [BookingStep.Date]: 'Date',
  [BookingStep.Time]: 'Time',
  [BookingStep.Details]: 'Your details',
  [BookingStep.Review]: 'Review & confirm',
};

/**
 * Booking page: date → time → details → review, one step open at a time. Phones show the steps as cards that collapse
 * to a summary line once done, with a sticky bar holding the picks and Review booking; from `lg`, a step rail sits
 * beside one step with Back and Continue. Both share `openStep` and the form's progress (#207–#209).
 *
 * The page owns the form and sends the booking when it's submitted; each step gets the controls it edits, and reads
 * the rest from the store. The booking in progress is thrown away with the page; the last one is kept in the booking
 * slice for 24 hours, without name or phone (BR-22). Every date and time shows on the shop's clock (`timeZone`), so
 * none shows until the shop has loaded at least once.
 */
@Component({
  selector: 'app-booking',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    Backdrop,
    NoticeMessage,
    DateStep,
    TimeStep,
    DetailsStep,
    ReviewStep,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly injector: Injector = inject(Injector);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly visibleMonth: Signal<string | null> = this.store.selectSignal(bookingFeature.selectVisibleMonth);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;
  protected readonly botCheckFailedNotice: BookingNotice = BOT_CHECK_FAILED_NOTICE;
  protected readonly availabilityNotice: Signal<BookingNotice | null> =
    this.store.selectSignal(bookingFeature.selectNotice);

  /**
   * The booking kept from an earlier visit (24 hours, without name or phone, BR-22). Read once when the page opens, so
   * a booking made now shows only in its own notice.
   */
  private readonly savedBooking: BookingConfirmation | null =
    toKeptBooking(this.store.selectSignal(bookingFeature.selectSavedConfirmation)());
  protected readonly savedBookingNotice: Signal<BookingNotice | null> = computed((): BookingNotice | null => {
    const timeZone: string | null = this.timeZone();
    if (!this.savedBooking || !timeZone) {
      return null;
    }
    return toBookedNotice(
      timeZone,
      this.savedBooking.startAt,
      null,
    );
  });

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

  /** The form's value as a signal, so the steps re-render when it changes. */
  protected readonly bookingFormValue: Signal<BookingFormValue> = toSignal(
    this.bookingForm.valueChanges.pipe(map((): BookingFormValue => this.bookingForm.getRawValue())),
    { initialValue: this.bookingForm.getRawValue() },
  );

  protected readonly isSubmitting: WritableSignal<boolean> = signal(false);
  protected readonly bookingNotice: WritableSignal<BookingNotice | null> = signal(null);
  /** "You're booked", until the next booking starts. */
  protected readonly bookedNotice: WritableSignal<BookingNotice | null> = signal(null);
  /** Kept while the same booking is retried, so a booking whose response was lost isn't made twice. */
  private idempotencyKey: string | null = null;

  protected readonly isDesktop: Signal<boolean> = this.watchMediaQuery(DESKTOP_QUERY);
  protected readonly bookingStep: typeof BookingStep = BookingStep;
  protected readonly openStep: WritableSignal<BookingStep> = signal(BookingStep.Date);
  /** Set by a review row's Change link: once that step is done again, the flow goes back to review. */
  private isReturningToReview: boolean = false;

  /** Re-read whenever the form's value changes; `readProgress` is for handlers that run before that signal updates. */
  private readonly progress: Signal<StepProgress> = computed((): StepProgress => {
    this.bookingFormValue();
    return this.readProgress();
  });

  protected readonly stepViews: Signal<StepView[]> = computed((): StepView[] => {
    const progress: StepProgress = this.progress();
    return BOOKING_STEPS.map((step: BookingStep, index: number): StepView => ({
      step,
      number: index + 1,
      title: STEP_TITLES[step],
      summary: this.toStepSummary(step, progress),
      isOpen: step === this.openStep(),
      isDone: isStepDone(step, progress),
      isLocked: !canOpenStep(step, progress),
    }));
  });

  protected readonly openStepView: Signal<StepView | undefined> = computed((): StepView | undefined =>
    this.stepViews().find((stepView: StepView): boolean => stepView.isOpen));

  protected readonly canReview: Signal<boolean> = computed((): boolean =>
    canOpenStep(BookingStep.Review, this.progress()));

  /** The sticky bar's picks on phones. */
  protected readonly pickedDayLabel: Signal<string> = computed((): string => {
    const date: string | null = this.bookingFormValue().date;
    return date ? formatShortDate(fromIsoDate(date)) : 'No day picked';
  });

  protected readonly pickedTimeLabel: Signal<string> = computed((): string => {
    const startAt: string | null = this.bookingFormValue().startAt;
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toTimeLabel(timeZone, startAt) : '—';
  });

  constructor() {
    // The page, not the date step, loads the first days: the date step goes away whenever its card collapses. They
    // wait for the shop's timezone, so "today" is the shop's, not the browser's.
    toObservable(this.timeZone)
      .pipe(
        filter((timeZone: string | null): boolean => timeZone !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe((): void => {
        this.store.dispatch(BookingActions.SetActiveMonthView({ month: null }));
      });
    this.bookingForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.startNewBooking();
      });
    this.bookingForm.controls.date.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((date: string | null): void => {
        if (date) {
          this.showStep(BookingStep.Time);
        }
      });
    this.bookingForm.controls.startAt.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((startAt: string | null): void => {
        if (startAt) {
          const isReviewReady: boolean = canOpenStep(BookingStep.Review, this.readProgress());
          this.showStep(this.isReturningToReview && isReviewReady ? BookingStep.Review : BookingStep.Details);
        }
      });
  }

  /** Opens `step` if every step before it is done, and moves focus to its heading. */
  protected showStep(step: BookingStep): void {
    if (!canOpenStep(step, this.readProgress())) {
      return;
    }
    if (step === BookingStep.Review) {
      this.isReturningToReview = false;
    }
    this.openStep.set(step);
    afterNextRender(
      (): void => {
        document.getElementById(`step-heading-${step}`)?.focus();
      },
      { injector: this.injector },
    );
  }

  /** A review row's Change link: the step opens, and finishing it comes back to review. */
  protected changeFromReview(step: BookingStep): void {
    this.isReturningToReview = true;
    this.showStep(step);
  }

  protected showNextStep(): void {
    const nextStep: BookingStep | null = toNextStep(this.openStep());
    if (nextStep) {
      this.showStep(nextStep);
    }
  }

  protected showPreviousStep(): void {
    const previousStep: BookingStep | null = toPreviousStep(this.openStep());
    if (previousStep) {
      this.showStep(previousStep);
    }
  }

  protected reloadMonth(): void {
    this.store.dispatch(BookingActions.SetActiveMonthView({ month: this.visibleMonth() }));
  }

  /** The form's submit, and a failed booking's retry. */
  protected confirm(): void {
    const {
      name,
      phone,
      startAt,
    }: BookingFormValue = this.bookingForm.getRawValue();
    if (this.bookingForm.invalid || !startAt || this.isSubmitting() || this.isBotCheckFailed()) {
      return;
    }
    if (!this.idempotencyKey) {
      this.idempotencyKey = crypto.randomUUID();
    }
    this.isSubmitting.set(true);
    this.bookingNotice.set(null);
    // Locked so the details can't change under a booking in flight; without events, so the booking isn't reset.
    this.bookingForm.disable({ emitEvent: false });
    this.bookingService
      .createBooking({
        startAt,
        name: name.trim(),
        phone: toE164(phone),
        idempotencyKey: this.idempotencyKey,
      })
      .pipe(
        finalize((): void => {
          this.bookingForm.enable({ emitEvent: false });
          this.isSubmitting.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (confirmedBooking: BookingConfirmation): void => {
          this.onBooked(confirmedBooking, phone);
        },
        error: (error: unknown): void => {
          this.onBookingFailed(error);
        },
      });
  }

  /**
   * Keeps the booking (BR-22), shows it, and starts the flow over at the date with the name and phone kept, so a
   * second booking for someone else is quick. Clearing the day starts a new booking, which clears the notices, so the
   * booked notice is set last; the booked time is gone, so the days reload.
   */
  private onBooked(confirmedBooking: BookingConfirmation, phone: string): void {
    this.idempotencyKey = null;
    this.store.dispatch(BookingActions.BookingConfirm({
      savedConfirmation: { booking: confirmedBooking, savedAt: new Date().toISOString() },
    }));
    this.bookingForm.controls.startAt.reset();
    this.bookingForm.controls.date.reset();
    this.openStep.set(BookingStep.Date);
    this.reloadMonth();
    const timeZone: string | null = this.timeZone();
    if (timeZone) {
      this.bookedNotice.set(toBookedNotice(
        timeZone,
        confirmedBooking.startAt,
        phone,
      ));
    }
  }

  /**
   * A taken time is gone for good, so it's dropped, the time step opens and the days reload to show what's still
   * open. Dropping it starts a new booking, which clears the notice, so the notice is set last. A failed bot check
   * already has its own message.
   */
  private onBookingFailed(error: unknown): void {
    if (this.isBotCheckFailed()) {
      return;
    }
    if (getProblemCode(error) === ProblemCode.SlotUnavailable) {
      this.bookingForm.controls.startAt.reset();
      this.showStep(BookingStep.Time);
      this.reloadMonth();
    }
    this.bookingNotice.set(toBookingNotice(error));
  }

  /** Changing any field makes the next confirm a new booking with a new key. */
  private startNewBooking(): void {
    this.idempotencyKey = null;
    this.bookedNotice.set(null);
    this.bookingNotice.set(null);
  }

  /**
   * A control's own `valueChanges` fires before the form's, so handlers for it read the progress here, not from
   * `progress`.
   */
  private readProgress(): StepProgress {
    const { controls }: BookingForm = this.bookingForm;
    return {
      hasDate: controls.date.value !== null,
      hasTime: controls.startAt.value !== null,
      areDetailsValid: controls.name.valid && controls.phone.valid,
    };
  }

  private toStepSummary(step: BookingStep, progress: StepProgress): string {
    const formValue: BookingFormValue = this.bookingFormValue();
    switch (step) {
      case BookingStep.Date:
        return formValue.date ? formatFullDate(fromIsoDate(formValue.date)) : 'Pick a day';
      case BookingStep.Time:
        if (!progress.hasDate) {
          return 'Pick a day first';
        }
        return progress.hasTime ? this.pickedTimeLabel() : 'Pick a time';
      case BookingStep.Details:
        return progress.areDetailsValid ? `${formValue.name.trim()} · ${formValue.phone}` : 'Name and phone';
      case BookingStep.Review:
        return 'Check and book';
    }
  }

  /** Whether `query` matches, kept up to date; false where there's no window (prerendering). */
  private watchMediaQuery(query: string): Signal<boolean> {
    if (typeof window === 'undefined') {
      return signal(false);
    }
    const mediaQuery: MediaQueryList = window.matchMedia(query);
    const isMatching: WritableSignal<boolean> = signal(mediaQuery.matches);
    const onChange: (event: MediaQueryListEvent) => void = (event: MediaQueryListEvent): void => {
      isMatching.set(event.matches);
    };
    mediaQuery.addEventListener('change', onChange);
    this.destroyRef.onDestroy((): void => {
      mediaQuery.removeEventListener('change', onChange);
    });
    return isMatching;
  }
}
