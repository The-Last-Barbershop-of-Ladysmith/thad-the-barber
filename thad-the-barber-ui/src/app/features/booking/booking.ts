import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { finalize, map } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { toE164 } from '../../shared/utils/phone.utils';
import { getProblemCode } from '../../shared/utils/problem.utils';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import { BookingSummary } from './components/booking-summary/booking-summary';
import { DateStep } from './components/date-step/date-step';
import { DetailsStep } from './components/details-step/details-step';
import { NoticeMessage } from './components/notice-message/notice-message';
import { TimeStep } from './components/time-step/time-step';
import { BookingConfirmation } from './models/booking-confirmation.model';
import { BookingForm } from './models/booking-form.model';
import { BookingFormValue } from './models/booking-form-value.model';
import { BookingNotice } from './models/booking-notice.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { toBookedNotice, toBookingNotice } from './utils/booking-notice.utils';
import { toKeptBooking } from './utils/saved-confirmation.utils';

/**
 * Booking page: date → time → details, with a live summary. The page owns the form and sends the booking when it's
 * submitted; each step gets the controls it edits, and reads the rest from the store. The booking in progress is
 * thrown away with the page; the last one is kept in the booking slice for 24 hours, without name or phone (BR-22).
 * Every date and time shows on the shop's clock (`timeZone`), so none shows until the shop has loaded at least once.
 */
@Component({
  selector: 'app-booking',
  imports: [
    ReactiveFormsModule,
    Backdrop,
    NoticeMessage,
    DateStep,
    TimeStep,
    DetailsStep,
    BookingSummary,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly visibleMonth: Signal<string | null> = this.store.selectSignal(bookingFeature.selectVisibleMonth);
  private readonly isBotCheckFailed: Signal<boolean> = inject(SessionService).isBotCheckFailed;
  protected readonly availabilityNotice: Signal<BookingNotice | null> =
    this.store.selectSignal(bookingFeature.selectNotice);

  /**
   * The booking kept from an earlier visit (24 hours, without name or phone, BR-22). Read once when the page opens, so
   * a booking made now shows only in the summary.
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

  /** The form's value as a signal, so the steps and summary get it as an input and re-render when it changes. */
  protected readonly bookingFormValue: Signal<BookingFormValue> = toSignal(
    this.bookingForm.valueChanges.pipe(map((): BookingFormValue => this.bookingForm.getRawValue())),
    { initialValue: this.bookingForm.getRawValue() },
  );

  protected readonly isSubmitting: WritableSignal<boolean> = signal(false);
  protected readonly bookingNotice: WritableSignal<BookingNotice | null> = signal(null);
  protected readonly confirmedBooking: WritableSignal<BookingConfirmation | null> = signal(null);
  /** Kept while the same booking is retried, so a booking whose response was lost isn't made twice. */
  private idempotencyKey: string | null = null;

  constructor() {
    this.bookingForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.startNewBooking();
      });
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
    const isBooked: boolean = this.confirmedBooking() !== null;
    if (this.bookingForm.invalid || !startAt || this.isSubmitting() || isBooked || this.isBotCheckFailed()) {
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
          this.idempotencyKey = null;
          this.confirmedBooking.set(confirmedBooking);
          this.store.dispatch(BookingActions.BookingConfirm({
            savedConfirmation: { booking: confirmedBooking, savedAt: new Date().toISOString() },
          }));
        },
        error: (error: unknown): void => {
          this.onBookingFailed(error);
        },
      });
  }

  /**
   * A taken time is gone for good, so it's dropped and the month reloads to show what's still open. Dropping it
   * starts a new booking, which clears the notice, so the notice is set last. A failed bot check already has its own
   * message.
   */
  private onBookingFailed(error: unknown): void {
    if (this.isBotCheckFailed()) {
      return;
    }
    if (getProblemCode(error) === ProblemCode.SlotUnavailable) {
      this.bookingForm.controls.startAt.reset();
      this.reloadMonth();
    }
    this.bookingNotice.set(toBookingNotice(error));
  }

  /** Changing any field makes the next confirm a new booking with a new key. */
  private startNewBooking(): void {
    this.idempotencyKey = null;
    this.confirmedBooking.set(null);
    this.bookingNotice.set(null);
  }
}
