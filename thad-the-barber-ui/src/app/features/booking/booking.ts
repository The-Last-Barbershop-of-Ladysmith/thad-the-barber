import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
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
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
import { BookingConfirmation } from './dtos/booking-confirmation.dto';
import { BookingForm } from './models/booking-form.model';
import { BookingFormValue } from './models/booking-form-value.model';
import { BookingNotice } from './models/booking-notice.model';
import { BookingStep } from './models/booking-step.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { BOT_CHECK_FAILED_NOTICE, toBookedNotice, toBookingNotice } from './utils/booking-notice.utils';
import { BOOKING_STEPS, StepProgress, canOpenStep, isStepDone } from './utils/booking-steps.utils';
import { toTimeLabel } from './utils/booking-time.utils';
import { toKeptBooking } from './utils/saved-confirmation.utils';

/** How one step shows in the phone's step cards and the desktop's step rail. */
interface StepView {
  step: BookingStep;
  number: number;
  title: string;
  /** What's picked ("Monday, October 27th 2026"), or what to do while nothing is ("Pick a day"). */
  summary: string;
  isOpen: boolean;
  isDone: boolean;
  /** A step opens only once every step before it is done. */
  isLocked: boolean;
}

type StepState = Omit<StepView, 'isOpen'>;

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
    ConfirmDialogModule,
    Backdrop,
    NoticeMessage,
    DateStep,
    TimeStep,
    DetailsStep,
    ReviewStep,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly injector: Injector = inject(Injector);
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);

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

  /** The step rail and one step at a time from `lg`; below it, the steps collapse into cards (#207, #208). */
  protected readonly isDesktop: Signal<boolean> = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 64rem)')
      .pipe(map((breakpointState: BreakpointState): boolean => breakpointState.matches)),
    { initialValue: false },
  );
  protected readonly bookingStep: typeof BookingStep = BookingStep;
  protected readonly openStep: WritableSignal<BookingStep> = signal(BookingStep.Date);
  /** Set by a review row's Change link: once that step is done again, the flow goes back to review. */
  private isReturningToReview: boolean = false;

  /** The picks the last form change saw, so the next one can tell which pick changed and open the step after it. */
  private lastPicks: Pick<BookingFormValue, 'date' | 'startAt'> = { date: null, startAt: null };

  /** The pick alone, so typing a name or phone doesn't reformat the day and time labels. */
  private readonly pickedDate: Signal<string | null> = computed((): string | null => this.bookingFormValue().date);
  private readonly pickedStartAt: Signal<string | null> = computed((): string | null =>
    this.bookingFormValue().startAt);

  /** Name and phone validity has no signal of its own; it only changes with the form's value, which is read here. */
  private readonly progress: Signal<StepProgress> = computed((): StepProgress => {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    return {
      hasDate: date !== null,
      hasTime: startAt !== null,
      areDetailsValid: this.bookingForm.controls.name.valid && this.bookingForm.controls.phone.valid,
    };
  });

  protected readonly pickedDateLabel: Signal<string | null> = computed((): string | null => {
    const date: string | null = this.pickedDate();
    return date ? formatFullDate(fromIsoDate(date)) : null;
  });

  protected readonly pickedTimeLabel: Signal<string | null> = computed((): string | null => {
    const startAt: string | null = this.pickedStartAt();
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toTimeLabel(timeZone, startAt) : null;
  });

  /** The sticky bar's day on phones. */
  protected readonly pickedDayShortLabel: Signal<string> = computed((): string => {
    const date: string | null = this.pickedDate();
    return date ? formatShortDate(fromIsoDate(date)) : 'No day picked';
  });

  /** Everything about each step but whether it's open, so opening one doesn't rebuild the summaries. */
  private readonly stepStates: Signal<StepState[]> = computed((): StepState[] => {
    const progress: StepProgress = this.progress();
    return BOOKING_STEPS.map((step: BookingStep, index: number): StepState => ({
      step,
      number: index + 1,
      title: STEP_TITLES[step],
      summary: this.toStepSummary(step, progress),
      isDone: isStepDone(step, progress),
      isLocked: !canOpenStep(step, progress),
    }));
  });

  protected readonly stepViews: Signal<StepView[]> = computed((): StepView[] =>
    this.stepStates().map((stepState: StepState): StepView => ({
      ...stepState,
      isOpen: stepState.step === this.openStep(),
    })));

  protected readonly openStepView: Signal<StepView | undefined> = computed((): StepView | undefined =>
    this.stepViews().find((stepView: StepView): boolean => stepView.isOpen));

  protected readonly canReview: Signal<boolean> = computed((): boolean =>
    this.stepStates().at(-1)?.isLocked === false);

  /** A picked day that isn't booked yet; leaving would lose it (#210). Not while it's being sent. */
  private readonly hasUnconfirmedPick: Signal<boolean> = computed((): boolean =>
    this.pickedDate() !== null && !this.isSubmitting());

  constructor() {
    this.askBeforeUnloadWhileUnconfirmed();
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
    // Subscribed after `bookingFormValue`, so the signals already hold the new value here.
    this.bookingForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.startNewBooking();
        this.openStepAfterNewPick();
      });
  }

  /**
   * The route's leave guard: with a day picked and not booked, asks "Leave without booking?" (Keep booking is the
   * default, and Escape keeps booking too); otherwise lets the customer go.
   */
  confirmLeave(): boolean | Promise<boolean> {
    if (!this.hasUnconfirmedPick()) {
      return true;
    }
    return new Promise<boolean>((resolve: (canLeave: boolean) => void): void => {
      this.confirmationService.confirm({
        key: 'leave-booking',
        header: 'Leave without booking?',
        message: 'Your booking isn’t confirmed yet, so the time you picked isn’t held for you. If you leave, you’ll start over.',
        rejectButtonProps: { label: 'Keep booking' },
        acceptButtonProps: {
          label: 'Leave',
          severity: 'secondary',
          outlined: true,
        },
        defaultFocus: 'reject',
        closeOnEscape: true,
        accept: (): void => {
          resolve(true);
        },
        reject: (): void => {
          resolve(false);
        },
      });
    });
  }

  /** Opens `step` if every step before it is done, and moves focus to its heading. */
  protected showStep(step: BookingStep): void {
    if (!canOpenStep(step, this.progress())) {
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

  /** Back (-1) and Continue (1). */
  protected showAdjacentStep(offset: number): void {
    const adjacentStep: BookingStep | undefined = BOOKING_STEPS[BOOKING_STEPS.indexOf(this.openStep()) + offset];
    if (adjacentStep) {
      this.showStep(adjacentStep);
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
    this.bookingForm.patchValue({ date: null, startAt: null });
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

  /** Picking a day opens the time step; picking a time opens the details, or review after a review row's Change. */
  private openStepAfterNewPick(): void {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    const isNewDay: boolean = date !== null && date !== this.lastPicks.date;
    const isNewTime: boolean = startAt !== null && startAt !== this.lastPicks.startAt;
    this.lastPicks = { date, startAt };
    if (isNewDay) {
      this.showStep(BookingStep.Time);
    } else if (isNewTime) {
      const canReturnToReview: boolean = this.isReturningToReview && canOpenStep(BookingStep.Review, this.progress());
      this.showStep(canReturnToReview ? BookingStep.Review : BookingStep.Details);
    }
  }

  private toStepSummary(step: BookingStep, progress: StepProgress): string {
    switch (step) {
      case BookingStep.Date:
        return this.pickedDateLabel() ?? 'Pick a day';
      case BookingStep.Time:
        if (!progress.hasDate) {
          return 'Pick a day first';
        }
        return this.pickedTimeLabel() ?? 'Pick a time';
      case BookingStep.Details: {
        const { name, phone }: BookingFormValue = this.bookingFormValue();
        return progress.areDetailsValid ? `${name.trim()} · ${phone}` : 'Name and phone';
      }
      case BookingStep.Review:
        return 'Check and book';
    }
  }

  /**
   * Closing or reloading the tab with an unconfirmed pick gets the browser's own prompt; the browser picks its text.
   * The listener is there only while there's a pick, since an always-on one keeps the page out of the back/forward
   * cache.
   */
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
}
