import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DatePickerMonthChangeEvent } from 'primeng/types/datepicker';
import { finalize } from 'rxjs';
import { BookingSettings } from '../shop/models/booking-settings.model';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { SessionService } from '../../core/services/session.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { formatShortDate, fromIsoDate, fromMonthKey, toIsoDate, toMonthKey } from '../../shared/utils/date.utils';
import { toE164 } from '../../shared/utils/phone.utils';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { getProblemCode } from '../../shared/utils/problem.utils';
import { PHONE_PATTERN, nameValidators, phoneValidators } from '../../shared/validators/form.validators';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import { BookingSummary, SummaryRow } from './components/booking-summary/booking-summary';
import { DateStep } from './components/date-step/date-step';
import { BookingDetailsForm, DetailsStep } from './components/details-step/details-step';
import { NoticeMessage } from './components/notice-message/notice-message';
import { TimeStep } from './components/time-step/time-step';
import { AvailableDay } from './models/available-day.model';
import { BookingConfirmation } from './models/booking-confirmation.model';
import { BookingDetails } from './models/booking-details.model';
import { BookingNotice } from './models/booking-notice.model';
import { SavedConfirmation } from './models/saved-confirmation.model';
import { DateRange } from './models/date-range.model';
import { TimeSlot } from './models/time-slot.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { toBookingNotice } from './utils/booking-notice.utils';
import { isKept } from './utils/saved-confirmation.utils';
import { toBookingWindow, toLongDateTime, toTimeLabel, toTimeSlots } from './utils/booking-time.utils';

/**
 * Booking page: date → time → details, with a live summary. The month's availability and the last booking (kept for
 * 24 hours, without name or phone, BR-22) are in the booking slice; the picks, the customer's details and the booking
 * in progress are this page's, thrown away when it closes. Every date and time shows on the shop's clock
 * (`timeZone`), so none shows until the shop has loaded at least once.
 */
@Component({
  selector: 'app-booking',
  imports: [
    Backdrop,
    DateStep,
    TimeStep,
    DetailsStep,
    BookingSummary,
    NoticeMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking implements OnInit {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly bookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);
  protected readonly isBotCheckFailed: Signal<boolean> = this.sessionService.isBotCheckFailed;
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);

  protected readonly window: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.bookingSettings(), this.timeZone()));

  private readonly visibleMonth: Signal<string | null> = this.store.selectSignal(bookingFeature.selectVisibleMonth);
  /** Opens the calendar on the month whose days are loaded, which can differ from the browser's month. */
  protected readonly visibleMonthStart: Signal<Date | undefined> = computed((): Date | undefined => {
    const month: string | null = this.visibleMonth();
    if (!month) {
      return undefined;
    }
    return fromMonthKey(month);
  });
  private readonly availableDays: Signal<AvailableDay[]> = this.store.selectSignal(bookingFeature.selectAvailableDays);
  protected readonly disabledDates: Signal<Date[]> = this.store.selectSignal(bookingFeature.selectDisabledDates);
  protected readonly isLoadingDates: Signal<boolean> = this.store.selectSignal(bookingFeature.selectIsLoading);
  protected readonly availabilityNotice: Signal<BookingNotice | null> =
    this.store.selectSignal(bookingFeature.selectNotice);

  /** "2026-10-03" on the shop's calendar. */
  private readonly selectedDate: WritableSignal<string | null> = signal(null);
  /** One of the picked day's UTC start times. */
  protected readonly selectedStartAt: WritableSignal<string | null> = signal(null);
  protected readonly isSubmitting: WritableSignal<boolean> = signal(false);
  /** Starts as the kept booking, so a reload still shows it; a tab left open checks it hasn't expired (BR-22). */
  private readonly confirmation: WritableSignal<BookingConfirmation | null> =
    signal(toKeptBooking(this.store.selectSignal(bookingFeature.selectSavedConfirmation)()));
  /** The phone the booking was sent with; the form may have changed while it was in flight. */
  private readonly bookedPhone: WritableSignal<string> = signal('');
  protected readonly bookingNotice: WritableSignal<BookingNotice | null> = signal(null);
  /** Kept while the same booking is retried, so a booking whose response was lost isn't made twice. */
  private idempotencyKey: string | null = null;

  protected readonly selectedDay: Signal<Date | null> = computed((): Date | null => {
    const date: string | null = this.selectedDate();
    if (!date) {
      return null;
    }
    return fromIsoDate(date);
  });

  protected readonly slots: Signal<TimeSlot[]> = computed((): TimeSlot[] =>
    toTimeSlots(
      this.availableDays(),
      this.selectedDate(),
      this.timeZone(),
    ));

  protected readonly isBooked: Signal<boolean> = computed((): boolean => this.confirmation() !== null);

  protected readonly form: BookingDetailsForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: nameValidators }),
    phone: new FormControl('', { nonNullable: true, validators: phoneValidators }),
  });

  private readonly details: Signal<Partial<BookingDetails>> = toSignal(
    this.form.valueChanges,
    { initialValue: this.form.getRawValue() },
  );

  private readonly attempted: WritableSignal<boolean> = signal(false);

  private readonly missing: Signal<string[]> = computed((): string[] => {
    const details: Partial<BookingDetails> = this.details();
    const name: string = details.name ?? '';
    const phone: string = details.phone ?? '';
    const missing: string[] = [];
    if (!this.selectedDay()) {
      missing.push('a date');
    }
    if (!this.selectedStartAt()) {
      missing.push('a time');
    }
    if (name.trim().length < 2) {
      missing.push('your name');
    }
    if (!PHONE_PATTERN.test(phone)) {
      missing.push('a 10-digit phone');
    }
    return missing;
  });

  protected readonly hint: Signal<string | null> = computed((): string | null =>
    this.attempted() && this.missing().length > 0 ? `Still need ${this.missing().join(', ')}.` : null);

  protected readonly summaryRows: Signal<SummaryRow[]> = computed((): SummaryRow[] => {
    const day: Date | null = this.selectedDay();
    const startAt: string | null = this.selectedStartAt();
    const timeZone: string | null = this.timeZone();
    const details: Partial<BookingDetails> = this.details();
    const name: string = details.name?.trim() ?? '';
    const phone: string = details.phone ?? '';
    return [
      { label: 'Date', value: day ? formatShortDate(day) : '—' },
      { label: 'Time', value: startAt && timeZone ? toTimeLabel(timeZone, startAt) : '—' },
      { label: 'Name', value: name || '—' },
      { label: 'Phone', value: phone || '—' },
    ];
  });

  protected readonly confirmationText: Signal<string | null> = computed((): string | null => {
    const booking: BookingConfirmation | null = this.confirmation();
    const timeZone: string | null = this.timeZone();
    if (!booking || !timeZone) {
      return null;
    }
    const when: string = `${toLongDateTime(timeZone, booking.startAt)}.`;
    const phone: string = this.bookedPhone();
    // After a reload the phone is gone: it's never saved (BR-22).
    if (!phone) {
      return when;
    }
    return `${when} A text confirmation goes to ${phone}.`;
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.startNewBooking();
      });
  }

  ngOnInit(): void {
    this.store.dispatch(BookingActions.SetActiveMonthView({ month: toMonthKey(this.window()?.min ?? new Date()) }));
  }

  protected onMonthChange(event: DatePickerMonthChangeEvent): void {
    if (event.month === undefined || event.year === undefined) {
      return;
    }
    this.store.dispatch(BookingActions.SetActiveMonthView({
      month: toMonthKey(new Date(
        event.year,
        event.month - 1,
        1,
      )),
    }));
  }

  protected reloadMonth(): void {
    const month: string | null = this.visibleMonth();
    if (month) {
      this.store.dispatch(BookingActions.SetActiveMonthView({ month }));
    }
  }

  protected onDateSelect(date: Date): void {
    this.selectedDate.set(toIsoDate(date));
    this.selectedStartAt.set(null);
    this.startNewBooking();
  }

  protected onTimeSelect(startAt: string): void {
    this.selectedStartAt.set(startAt);
    this.startNewBooking();
  }

  protected confirm(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    const startAt: string | null = this.selectedStartAt();
    const isIncomplete: boolean = this.missing().length > 0;
    const isUnavailable: boolean = this.isSubmitting() || this.isBooked() || this.isBotCheckFailed();
    if (isIncomplete || !startAt || isUnavailable) {
      return;
    }

    if (!this.idempotencyKey) {
      this.idempotencyKey = crypto.randomUUID();
    }
    const details: BookingDetails = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.bookingNotice.set(null);
    this.bookingService
      .createBooking({
        startAt,
        name: details.name.trim(),
        phone: toE164(details.phone),
        idempotencyKey: this.idempotencyKey,
      })
      .pipe(
        finalize((): void => {
          this.isSubmitting.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (confirmation: BookingConfirmation): void => {
          this.idempotencyKey = null;
          this.bookedPhone.set(details.phone);
          this.confirmation.set(confirmation);
          this.store.dispatch(BookingActions.BookingConfirm({
            savedConfirmation: { booking: confirmation, savedAt: new Date().toISOString() },
          }));
        },
        error: (error: unknown): void => {
          this.onBookingFailed(error);
        },
      });
  }

  /**
   * A taken time is gone for good, so it's dropped and the month reloads to show what's still open. A failed bot check
   * already has its own message in the summary.
   */
  private onBookingFailed(error: unknown): void {
    if (this.isBotCheckFailed()) {
      return;
    }
    this.bookingNotice.set(toBookingNotice(error));
    const isSlotTaken: boolean = getProblemCode(error) === ProblemCode.SlotUnavailable;
    if (isSlotTaken) {
      this.idempotencyKey = null;
      this.selectedStartAt.set(null);
      this.reloadMonth();
    }
  }

  /** Changing the date, time or details makes the next confirm a new booking with a new key. */
  private startNewBooking(): void {
    this.idempotencyKey = null;
    this.confirmation.set(null);
    this.bookingNotice.set(null);
  }
}

function toKeptBooking(savedConfirmation: SavedConfirmation | null): BookingConfirmation | null {
  const isStillKept: boolean = savedConfirmation !== null && isKept(savedConfirmation);
  if (!isStillKept) {
    return null;
  }
  return savedConfirmation?.booking ?? null;
}
