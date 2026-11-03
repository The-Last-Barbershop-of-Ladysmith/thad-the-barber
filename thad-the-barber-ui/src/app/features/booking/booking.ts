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
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SpinnerIcon } from 'primeng/icons/spinner';
import { distinctUntilChanged, map } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { NoticeMessage } from '../../shared/components/notice-message/notice-message';
import { Notice } from '../../shared/models/notice.model';
import { toE164 } from '../../shared/utils/phone.utils';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import { DateStep } from './components/date-step/date-step';
import { DetailsStep } from './components/details-step/details-step';
import { TimeStep } from './components/time-step/time-step';
import { AvailableDay } from './dtos/available-day.dto';
import { BookingConfirmation } from './dtos/booking-confirmation.dto';
import { AvailabilityView } from './models/availability-view.model';
import { BookingForm } from './models/booking-form.model';
import { BookingFormValue } from './models/booking-form-value.model';
import { LeaveConfirmable } from './models/leave-confirmable.model';
import { ManagePageState } from './models/manage-page-state.model';
import { ReschedulePageState } from './models/reschedule-page-state.model';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { BOOKING_NOT_FOUND_NOTICE, BOT_CHECK_FAILED_NOTICE } from './utils/booking-notice.utils';
import { toLongDateTime } from './utils/booking-time.utils';
import { toManagePath } from './utils/manage-link.utils';

@Component({
  selector: 'app-booking',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    SpinnerIcon,
    Backdrop,
    NoticeMessage,
    DateStep,
    TimeStep,
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
  private readonly savedConfirmations: Signal<BookingConfirmation[]> =
    this.store.selectSignal(bookingFeature.selectSavedConfirmations);
  private readonly savedConfirmation: Signal<BookingConfirmation | undefined> = computed(
    (): BookingConfirmation | undefined => this.savedConfirmations()
      .find((confirmation: BookingConfirmation): boolean => confirmation.id === this.bookingId()),
  );
  protected readonly manageToken: Signal<string | null> = computed((): string | null =>
    this.reschedulePageState().manageToken ?? this.savedConfirmation()?.manageToken ?? null);
  protected readonly currentTimeLabel: Signal<string | null> = computed((): string | null => {
    const startAt: string | undefined = this.reschedulePageState().startAt ?? this.savedConfirmation()?.startAt;
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toLongDateTime(timeZone, startAt) : null;
  });

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly availabilityView: Signal<AvailabilityView | null> =
    this.store.selectSignal(bookingFeature.selectAvailabilityView);
  protected readonly isSubmitting: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsSubmitting);
  private readonly isSubmitDone: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsSubmitDone);
  protected readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;

  protected readonly botCheckFailedNotice: Notice = BOT_CHECK_FAILED_NOTICE;
  protected readonly bookingNotFoundNotice: Notice = BOOKING_NOT_FOUND_NOTICE;
  protected readonly availabilityNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectNotice);
  protected readonly submitNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectSubmitNotice);
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
  protected readonly bookingFormValue: Signal<BookingFormValue> = toSignal(
    this.bookingForm.valueChanges.pipe(map((): BookingFormValue => this.bookingForm.getRawValue())),
    { initialValue: this.bookingForm.getRawValue() },
  );
  // Kept while the same booking is retried, so one whose response was lost isn't made twice.
  private idempotencyKey: string | null = null;

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
          afterNextRender(
            (): void => {
              document.getElementById('time-heading')?.focus();
            },
            { injector: this.injector },
          );
        }
      });
  }

  protected reloadDays(): void {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    if (availabilityView) {
      this.store.dispatch(BookingActions.SetAvailabilityView({ availabilityView }));
    }
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
        this.reschedulePageState.set(this.router.currentNavigation()?.extras.state ?? {});
        this.bookingForm.reset();
        this.store.dispatch(BookingActions.BookingPageOpen());
      });
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

  // A taken time comes off the open times, and a view change empties them.
  private clearPicksNoLongerOpen(): void {
    this.store
      .select(bookingFeature.selectAvailableDays)
      .pipe(takeUntilDestroyed())
      .subscribe((availableDays: AvailableDay[]): void => {
        const { date, startAt }: BookingFormValue = this.bookingForm.getRawValue();
        const pickedDay: AvailableDay | undefined = availableDays
          .find((availableDay: AvailableDay): boolean => availableDay.date === date);
        if (date && !pickedDay) {
          this.bookingForm.controls.date.reset();
        } else if (startAt && !pickedDay?.times.includes(startAt)) {
          this.bookingForm.controls.startAt.reset();
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
}
