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
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter, finalize, fromEvent, map, take } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { RequestStatus } from '../../shared/models/request.models';
import { formatFullDate, formatShortDate, fromIsoDate, toIsoDate } from '../../shared/utils/date.utils';
import { toE164 } from '../../shared/utils/phone.utils';
import { getProblemCode } from '../../shared/utils/problem.utils';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import { DateStep } from './components/date-step/date-step';
import { DetailsStep } from './components/details-step/details-step';
import { NoticeMessage } from '../../shared/components/notice-message/notice-message';
import { ReviewStep } from './components/review-step/review-step';
import { TimeStep } from './components/time-step/time-step';
import { AvailableDay } from './dtos/available-day.dto';
import { BookingConfirmation } from './dtos/booking-confirmation.dto';
import { BookingForm } from './models/booking-form.model';
import { BookingFormValue } from './models/booking-form-value.model';
import { Notice } from '../../shared/models/notice.model';
import { AvailabilityViewKind } from './models/availability-view-kind.model';
import { AvailabilityView } from './models/availability-view.model';
import { BookingStep } from './models/booking-step.model';
import { ManagePageState } from './models/manage-page-state.model';
import { DateRange } from './models/date-range.model';
import { StepProgress } from './models/step-progress.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { BOT_CHECK_FAILED_NOTICE, toBookedHereNotice, toBookingNotice } from './utils/booking-notice.utils';
import { BOOKING_STEPS, canOpenStep, isStepDone } from './utils/booking-steps.utils';
import { toBookingWindow, toTimeLabel, toUpcomingView } from './utils/booking-time.utils';
import { toManagePath } from './utils/manage-link.utils';

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
 * the rest from the store. The booking in progress is thrown away with the page; each one made is kept in the booking
 * slice until it starts, without name or phone (BR-22), and opens its own page to confirm it. Every date and time
 * shows on the shop's clock (`timeZone`), so none shows until the shop has loaded at least once.
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
  private readonly router: Router = inject(Router);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.store.selectSignal(shopFeature.selectBookingSettings)(), this.timeZone()));
  private readonly availabilityView: Signal<AvailabilityView | null> =
    this.store.selectSignal(bookingFeature.selectAvailabilityView);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;
  protected readonly botCheckFailedNotice: Notice = BOT_CHECK_FAILED_NOTICE;
  protected readonly availabilityNotice: Signal<Notice | null> =
    this.store.selectSignal(bookingFeature.selectNotice);

  /** "You have an upcoming booking", while this device keeps one (BR-22). */
  protected readonly upcomingBookingNotice: Signal<Notice | null> =
    this.store.selectSignal(bookingFeature.selectUpcomingBookingNotice);

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
  protected readonly bookingNotice: WritableSignal<Notice | null> = signal(null);
  /** Set once the booking went through, as the page leaves for the booking's own page: nothing more is sent. */
  private readonly isBooked: WritableSignal<boolean> = signal(false);
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

  /**
   * Name and phone validity has no signal of its own; it only changes with the form's value, which is read here.
   * `invalid`, not `valid`: the form is disabled while a booking is sent, and disabled controls aren't `valid`.
   */
  private readonly progress: Signal<StepProgress> = computed((): StepProgress => {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    return {
      hasDate: date !== null,
      hasTime: startAt !== null,
      areDetailsValid: !this.bookingForm.controls.name.invalid && !this.bookingForm.controls.phone.invalid,
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

  /**
   * A picked day that isn't booked yet; leaving would lose it (#210). That includes a booking being sent: leaving then
   * drops its response, so it would be neither shown nor kept.
   */
  private readonly hasUnconfirmedPick: Signal<boolean> = computed((): boolean => {
    const hasPick: boolean = this.pickedDate() !== null;
    return hasPick && !this.isBooked();
  });

  constructor() {
    this.askBeforeUnloadWhileUnconfirmed();
    this.moveUpcomingDaysToTodayOnReturn();
    // The page, not the date step, loads the first days: the date step goes away whenever its card collapses. They
    // wait for the shop, so "today" and the booking window are the shop's, not the browser's.
    toObservable(this.bookingWindow)
      .pipe(
        filter((bookingWindow: DateRange | null): bookingWindow is DateRange => bookingWindow !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe((bookingWindow: DateRange): void => {
        this.store.dispatch(BookingActions.SetAvailabilityView({
          availabilityView: toUpcomingView(bookingWindow.min, bookingWindow),
        }));
      });
    this.store
      .select(bookingFeature.selectAvailableDays)
      .pipe(takeUntilDestroyed())
      .subscribe((availableDays: AvailableDay[]): void => {
        this.dropPickedDayWithoutTimes(availableDays);
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

  /** Reloads the days in view; before the first load there's nothing to reload. */
  protected reloadMonth(): void {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    if (availabilityView) {
      this.store.dispatch(BookingActions.SetAvailabilityView({ availabilityView }));
    }
  }

  /** The form's submit, and a failed booking's retry. */
  protected confirm(): void {
    const {
      name,
      phone,
      startAt,
    }: BookingFormValue = this.bookingForm.getRawValue();
    const canSend: boolean = !this.isSubmitting() && !this.isBooked() && !this.isBotCheckFailed();
    if (this.bookingForm.invalid || !startAt || !canSend) {
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
          this.onBooked(confirmedBooking);
        },
        error: (error: unknown): void => {
          this.onBookingFailed(error);
        },
      });
  }

  /**
   * Keeps the booking (BR-22), where its manage page finds the token and time, and opens that page to confirm it. Once
   * booked, leaving doesn't ask "Leave without booking?" (#210).
   */
  private onBooked(confirmedBooking: BookingConfirmation): void {
    this.idempotencyKey = null;
    this.store.dispatch(BookingActions.BookingConfirm({ bookingConfirmation: confirmedBooking }));
    this.isBooked.set(true);
    const managePageState: ManagePageState = { isJustBooked: true };
    this.router.navigateByUrl(toManagePath(confirmedBooking.id), { state: managePageState }).then(
      (isNavigated: boolean): void => {
        if (!isNavigated) {
          this.confirmHere(confirmedBooking);
        }
      },
      (): void => {
        this.confirmHere(confirmedBooking);
      },
    );
  }

  /**
   * The booking's page didn't open, so this page confirms it and starts over at the date for another booking. Clearing
   * the day clears the notices, so the booked notice is set last.
   */
  private confirmHere(confirmedBooking: BookingConfirmation): void {
    this.isBooked.set(false);
    this.bookingForm.patchValue({ date: null, startAt: null });
    this.openStep.set(BookingStep.Date);
    this.bookingNotice.set(toBookedHereNotice(confirmedBooking.id));
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
    this.bookingNotice.set(null);
  }

  /**
   * Picking a day clears the last day's time and opens the time step; picking a time opens the details, or review
   * after a review row's Change.
   */
  private openStepAfterNewPick(): void {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    const isNewDay: boolean = date !== null && date !== this.lastPicks.date;
    const isNewTime: boolean = startAt !== null && startAt !== this.lastPicks.startAt;
    const isLastDaysTime: boolean = isNewDay && startAt !== null && !isNewTime;
    this.lastPicks = { date, startAt };
    if (isNewDay) {
      if (isLastDaysTime) {
        this.bookingForm.controls.startAt.reset();
      }
      this.showStep(BookingStep.Time);
    } else if (isNewTime) {
      const canReturnToReview: boolean = this.isReturningToReview && canOpenStep(BookingStep.Review, this.progress());
      this.showStep(canReturnToReview ? BookingStep.Review : BookingStep.Details);
    }
  }

  /**
   * After a taken time reloads the days, the picked day may have none left; it's dropped and the date step opens. The
   * taken-time notice is put back, since clearing the day starts a new booking, which clears notices.
   */
  private dropPickedDayWithoutTimes(availableDays: AvailableDay[]): void {
    const date: string | null = this.pickedDate();
    const isLoaded: boolean = this.store.selectSignal(bookingFeature.selectLoadStatus)() === RequestStatus.Success;
    if (!date || !isLoaded || availableDays.some((availableDay: AvailableDay): boolean => availableDay.date === date)) {
      return;
    }
    const takenTimeNotice: Notice | null = this.bookingNotice();
    this.bookingForm.patchValue({ date: null, startAt: null });
    this.bookingNotice.set(takenTimeNotice);
    this.openStep.set(BookingStep.Date);
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
  /**
   * A 31-day view starts on the day it was opened; left open past midnight, it would start on a day that's gone. When
   * the customer comes back to the tab, a view that starts before the shop's today moves to today's block.
   */
  private moveUpcomingDaysToTodayOnReturn(): void {
    if (typeof document === 'undefined') {
      return;
    }
    fromEvent(document, 'visibilitychange')
      .pipe(
        filter((): boolean => document.visibilityState === 'visible'),
        takeUntilDestroyed(),
      )
      .subscribe((): void => {
        const availabilityView: AvailabilityView | null = this.availabilityView();
        const bookingWindow: DateRange | null = toBookingWindow(
          this.store.selectSignal(shopFeature.selectBookingSettings)(),
          this.timeZone(),
        );
        const isPastStart: boolean = availabilityView?.kind === AvailabilityViewKind.Upcoming
          && bookingWindow !== null
          && availabilityView.firstDay < toIsoDate(bookingWindow.min);
        if (bookingWindow && isPastStart) {
          this.store.dispatch(BookingActions.SetAvailabilityView({
            availabilityView: toUpcomingView(bookingWindow.min, bookingWindow),
          }));
        }
      });
  }

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
