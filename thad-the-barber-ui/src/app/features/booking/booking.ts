import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  InputSignal,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter, fromEvent, map } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { NoticeMessage } from '../../shared/components/notice-message/notice-message';
import { Notice } from '../../shared/models/notice.model';
import { RequestStatus } from '../../shared/models/request.models';
import { formatFullDate, formatShortDate, fromIsoDate, toIsoDate } from '../../shared/utils/date.utils';
import { toE164 } from '../../shared/utils/phone.utils';
import { AppState } from '../../store/app.state';
import { BookingSettings } from '../shop/models/booking-settings.model';
import { shopFeature } from '../shop/state/shop.feature';
import { DateStep } from './components/date-step/date-step';
import { DetailsStep } from './components/details-step/details-step';
import { ReviewStep } from './components/review-step/review-step';
import { StepFlow } from './components/step-flow/step-flow';
import { TimeStep } from './components/time-step/time-step';
import { AvailableDay } from './dtos/available-day.dto';
import { BookingConfirmation } from './dtos/booking-confirmation.dto';
import { AvailabilityViewKind } from './models/availability-view-kind.model';
import { AvailabilityView } from './models/availability-view.model';
import { BookingForm } from './models/booking-form.model';
import { BookingFormValue } from './models/booking-form-value.model';
import { BookingStep } from './models/booking-step.model';
import { DateRange } from './models/date-range.model';
import { LeaveConfirmable } from './models/leave-confirmable.model';
import { ReschedulePageState } from './models/reschedule-page-state.model';
import { StepProgress } from './models/step-progress.model';
import { StepView } from './models/step-view.model';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { BOOKING_NOT_FOUND_NOTICE, BOT_CHECK_FAILED_NOTICE } from './utils/booking-notice.utils';
import {
  BOOKING_STEPS,
  RESCHEDULE_STEPS,
  canOpenStep,
  toStepAfterPick,
  toStepSummaries,
  toStepViews,
} from './utils/booking-steps.utils';
import { toBookingWindow, toLongDateTime, toTimeLabel } from './utils/booking-time.utils';

/**
 * Booking page: date → time → details → review, one step open at a time, laid out by `StepFlow` (#207–#209). The page
 * owns the form; each step gets the controls it edits. Sending goes through the booking slice (`BookingRequest`,
 * `RescheduleRequest`), whose effects open the booking's page; its status, notice and retry key start over each time
 * the page opens. Every date and time shows on the shop's clock (`timeZone`), so none shows until the shop has loaded.
 *
 * At `/book/manage/{id}/reschedule` it moves that booking instead: date → time → review, no details, with the token
 * and current time from the booking's page (or this device's saved booking), then back to the booking's page.
 */
@Component({
  selector: 'app-booking',
  imports: [
    ReactiveFormsModule,
    ConfirmDialogModule,
    Backdrop,
    NoticeMessage,
    StepFlow,
    DateStep,
    TimeStep,
    DetailsStep,
    ReviewStep,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
})
export class Booking implements LeaveConfirmable {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly injector: Injector = inject(Injector);

  // Rescheduling: the booking being moved, its token and current time.
  /** The booking being moved, from `/book/manage/{id}/reschedule`; none when booking. */
  readonly id: InputSignal<string | undefined> = input<string>();
  readonly isRescheduling: Signal<boolean> = computed((): boolean => this.id() !== undefined);
  private readonly steps: Signal<readonly BookingStep[]> = computed((): readonly BookingStep[] =>
    (this.isRescheduling() ? RESCHEDULE_STEPS : BOOKING_STEPS));
  /** Read while this page's navigation runs; the router restores it on a reload. */
  private readonly reschedulePageState: ReschedulePageState = inject(Router).currentNavigation()?.extras.state ?? {};
  private readonly savedConfirmations: Signal<BookingConfirmation[]> =
    this.store.selectSignal(bookingFeature.selectSavedConfirmations);
  private readonly savedConfirmation: Signal<BookingConfirmation | undefined> = computed(
    (): BookingConfirmation | undefined => this.savedConfirmations()
      .find((confirmation: BookingConfirmation): boolean => confirmation.id === this.id()),
  );
  private readonly manageToken: Signal<string | null> = computed((): string | null =>
    this.reschedulePageState.manageToken ?? this.savedConfirmation()?.manageToken ?? null);
  /** Moving needs the booking's token; without one the booking can't be found. */
  protected readonly canReschedule: Signal<boolean> = computed((): boolean => this.manageToken() !== null);
  /** "Saturday, November 8 at 10:00 AM", the time being moved. */
  protected readonly currentTimeLabel: Signal<string | null> = computed((): string | null => {
    const startAt: string | undefined = this.reschedulePageState.startAt ?? this.savedConfirmation()?.startAt;
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toLongDateTime(timeZone, startAt) : null;
  });

  // The shop, the days in view and the notices.
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);
  private readonly availabilityView: Signal<AvailabilityView | null> =
    this.store.selectSignal(bookingFeature.selectAvailabilityView);
  private readonly loadStatus: Signal<RequestStatus> = this.store.selectSignal(bookingFeature.selectLoadStatus);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;
  protected readonly botCheckFailedNotice: Notice = BOT_CHECK_FAILED_NOTICE;
  protected readonly bookingNotFoundNotice: Notice = BOOKING_NOT_FOUND_NOTICE;
  protected readonly availabilityNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectNotice);
  protected readonly submitNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectSubmitNotice);
  /** "You have an upcoming booking", while this device keeps one (BR-22); not while moving one. */
  private readonly savedBookingsNotice: Signal<Notice | null> =
    this.store.selectSignal(bookingFeature.selectUpcomingBookingNotice);
  protected readonly upcomingBookingNotice: Signal<Notice | null> = computed((): Notice | null =>
    (this.isRescheduling() ? null : this.savedBookingsNotice()));

  // The form and the send.
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
  protected readonly isSubmitting: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsSubmitting);
  private readonly isSubmitDone: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsSubmitDone);
  private readonly idempotencyKey: Signal<string | null> = this.store.selectSignal(bookingFeature.selectIdempotencyKey);
  /** Set while the page drops a pick itself, so the notice saying why stays. */
  private isDroppingPick: boolean = false;

  // The steps.
  protected readonly bookingStep: typeof BookingStep = BookingStep;
  protected readonly openStep: WritableSignal<BookingStep> = signal(BookingStep.Date);
  /** Set by a review row's Change link: once that step is done again, the flow goes back to review. */
  private isReturningToReview: boolean = false;
  /** The picks the last form change saw, so the next one can tell which pick changed and open the step after it. */
  private lastPicks: Pick<BookingFormValue, 'date' | 'startAt'> = { date: null, startAt: null };

  /**
   * Name and phone validity has no signal of its own; it only changes with the form's value, which is read here.
   * `invalid`, not `valid`: the form is disabled while a booking is sent, and disabled controls aren't `valid`.
   */
  private readonly progress: Signal<StepProgress> = computed((): StepProgress => {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    const areDetailsValid: boolean = !this.bookingForm.controls.name.invalid
      && !this.bookingForm.controls.phone.invalid;
    return {
      hasDate: date !== null,
      hasTime: startAt !== null,
      // Moving a booking asks for no details: it already has them.
      areDetailsValid: this.isRescheduling() || areDetailsValid,
    };
  });
  protected readonly isFormValid: Signal<boolean> = computed((): boolean => {
    const {
      hasDate,
      hasTime,
      areDetailsValid,
    }: StepProgress = this.progress();
    return hasDate && hasTime && areDetailsValid;
  });

  /** The pick alone, so typing a name or phone doesn't reformat the day and time labels. */
  private readonly pickedDate: Signal<string | null> = computed((): string | null => this.bookingFormValue().date);
  private readonly pickedStartAt: Signal<string | null> = computed((): string | null =>
    this.bookingFormValue().startAt);
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

  protected readonly stepViews: Signal<StepView[]> = computed((): StepView[] => {
    const progress: StepProgress = this.progress();
    const { name, phone }: BookingFormValue = this.bookingFormValue();
    const summaries: Record<BookingStep, string> = toStepSummaries(progress, {
      date: this.pickedDateLabel(),
      time: this.pickedTimeLabel(),
      details: progress.areDetailsValid ? `${name.trim()} · ${phone}` : null,
      review: this.isRescheduling() ? 'Check and move' : 'Check and book',
    });
    return toStepViews(
      this.steps(),
      progress,
      summaries,
      this.openStep(),
    );
  });
  protected readonly canReview: Signal<boolean> = computed((): boolean =>
    this.stepViews().at(-1)?.isLocked === false);

  /**
   * A picked day that isn't booked (or moved) yet; leaving would lose it (#210). That includes one being sent: leaving
   * then drops its response, so it would be neither shown nor kept.
   */
  readonly hasUnconfirmedPick: Signal<boolean> = computed((): boolean =>
    this.pickedDate() !== null && !this.isSubmitDone());

  constructor() {
    this.store.dispatch(BookingActions.BookingPageOpen());
    // The page, not the date step, opens the first days: the date step goes away whenever its card collapses.
    this.store.dispatch(BookingActions.UpcomingDaysOpen());
    this.askBeforeUnloadWhileUnconfirmed();
    this.moveUpcomingDaysToTodayOnReturn();
    this.lockFormWhileSubmitting();
    this.followSendOutcomes();
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
        this.store.dispatch(BookingActions.BookingDraftChange({ isNoticeKept: this.isDroppingPick }));
        this.openStepAfterNewPick();
      });
  }

  /** Opens `step` if every step before it is done, and moves focus to its heading. */
  protected showStep(step: BookingStep): void {
    const canOpen: boolean = canOpenStep(
      step,
      this.progress(),
      this.steps(),
    );
    if (!canOpen) {
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
    const steps: readonly BookingStep[] = this.steps();
    const adjacentStep: BookingStep | undefined = steps[steps.indexOf(this.openStep()) + offset];
    if (adjacentStep) {
      this.showStep(adjacentStep);
    }
  }

  protected reloadDays(): void {
    this.store.dispatch(BookingActions.AvailabilityReload());
  }

  /** The form's submit, and a failed booking's (or move's) retry. */
  protected confirm(): void {
    const {
      name,
      phone,
      startAt,
    }: BookingFormValue = this.bookingForm.getRawValue();
    const canSend: boolean = !this.isSubmitting() && !this.isSubmitDone() && !this.isBotCheckFailed();
    if (!this.isFormValid() || !startAt || !canSend) {
      return;
    }
    const id: string | undefined = this.id();
    const manageToken: string | null = this.manageToken();
    if (id && manageToken) {
      this.store.dispatch(BookingActions.RescheduleRequest({
        bookingId: id,
        manageToken,
        startAt,
      }));
    } else if (!id) {
      this.store.dispatch(BookingActions.BookingRequest({
        bookingRequest: {
          startAt,
          name: name.trim(),
          phone: toE164(phone),
          idempotencyKey: this.idempotencyKey() ?? crypto.randomUUID(),
        },
      }));
    }
  }

  /** Locked so the details can't change under a send in flight; without events, so the booking isn't reset. */
  private lockFormWhileSubmitting(): void {
    effect((): void => {
      if (this.isSubmitting()) {
        this.bookingForm.disable({ emitEvent: false });
      } else {
        this.bookingForm.enable({ emitEvent: false });
      }
    });
  }

  /**
   * A taken time is dropped and the time step opens (the days reload and the notice follows, from the effect). A
   * booking whose page didn't open is confirmed here, starting over at the date for another booking.
   */
  private followSendOutcomes(): void {
    const actions$: Actions = inject<Actions>(Actions);
    actions$
      .pipe(
        ofType(BookingActions.BookingTimeTaken),
        takeUntilDestroyed(),
      )
      .subscribe((): void => {
        this.dropPicks({ startAt: null });
        this.showStep(BookingStep.Time);
      });
    actions$
      .pipe(
        ofType(BookingActions.BookingShownHere),
        takeUntilDestroyed(),
      )
      .subscribe((): void => {
        this.dropPicks({ date: null, startAt: null });
        this.openStep.set(BookingStep.Date);
      });
  }

  /** Drops picks the customer didn't change, keeping the notice that says why. */
  private dropPicks(picks: Partial<Pick<BookingFormValue, 'date' | 'startAt'>>): void {
    this.isDroppingPick = true;
    this.bookingForm.patchValue(picks);
    this.isDroppingPick = false;
  }

  /** Picking a day clears the last day's time and opens the time step; picking a time opens the next step. */
  private openStepAfterNewPick(): void {
    const { date, startAt }: BookingFormValue = this.bookingFormValue();
    const isNewDay: boolean = date !== null && date !== this.lastPicks.date;
    const isNewTime: boolean = startAt !== null && startAt !== this.lastPicks.startAt;
    this.lastPicks = { date, startAt };
    if (isNewDay && startAt !== null && !isNewTime) {
      this.bookingForm.controls.startAt.reset();
    }
    const nextStep: BookingStep | null = toStepAfterPick(
      isNewDay,
      isNewTime,
      this.isReturningToReview,
      this.progress(),
      this.steps(),
    );
    if (nextStep) {
      this.showStep(nextStep);
    }
  }

  /** After a taken time reloads the days, the picked day may have none left; it's dropped and the date step opens. */
  private dropPickedDayWithoutTimes(availableDays: AvailableDay[]): void {
    const date: string | null = this.pickedDate();
    const isLoaded: boolean = this.loadStatus() === RequestStatus.Success;
    if (!date || !isLoaded || availableDays.some((availableDay: AvailableDay): boolean => availableDay.date === date)) {
      return;
    }
    this.dropPicks({ date: null, startAt: null });
    this.openStep.set(BookingStep.Date);
  }

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
        const bookingWindow: DateRange | null = toBookingWindow(this.bookingSettings(), this.timeZone());
        const isPastStart: boolean = availabilityView?.kind === AvailabilityViewKind.Upcoming
          && bookingWindow !== null
          && availabilityView.firstDay < toIsoDate(bookingWindow.min);
        if (isPastStart) {
          this.store.dispatch(BookingActions.UpcomingDaysOpen());
        }
      });
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
